import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { SupabaseClient } from '@supabase/supabase-js';
import { coverPublicUrl } from '$lib/cover';
import type { Database } from '$lib/database.types';
import { parseAllergens } from '$lib/allergens';
import { parseRecipeCourse, parseRecipeEffort } from '$lib/classifications';
import { isRecipeId } from '$lib/recipeMutations';
import type { RecipeListItem, RecipeListResult } from '$lib/recipes';

export const FAMILY_NAME_MAX = 80;

type AppSupabase = SupabaseClient<Database>;

export type FamilySummary = {
	id: string;
	name: string;
	isCreator: boolean;
	isPrimary: boolean;
	memberCount: number;
};

export type FamilyMember = {
	userId: string;
	displayName: string | null;
	role: 'creator' | 'member';
};

export type FamilyInvite = {
	token: string;
	url: string;
};

export function parseFamilyIds(raw: Iterable<unknown> | FormData): string[] {
	const values = raw instanceof FormData ? raw.getAll('family_ids') : [...raw];
	const ids = values.map((value) => String(value ?? '')).filter(isRecipeId);
	return [...new Set(ids)];
}

export function parseFamilyName(raw: unknown): string | null {
	const name = String(raw ?? '')
		.trim()
		.slice(0, FAMILY_NAME_MAX);
	return name.length > 0 ? name : null;
}

export async function listMyFamilies(
	supabase: AppSupabase,
	userId: string
): Promise<FamilySummary[]> {
	const [{ data: memberships }, { data: profile }] = await Promise.all([
		supabase
			.from('family_members')
			.select('family_id, role, families(id, name)')
			.eq('user_id', userId),
		supabase.from('profiles').select('primary_family_id').eq('id', userId).maybeSingle()
	]);

	const rows = memberships ?? [];
	const familyIds = rows.map((row) => row.family_id);
	const counts = new Map<string, number>();

	if (familyIds.length > 0) {
		const { data: allMembers } = await supabase
			.from('family_members')
			.select('family_id')
			.in('family_id', familyIds);

		for (const row of allMembers ?? []) {
			counts.set(row.family_id, (counts.get(row.family_id) ?? 0) + 1);
		}
	}

	const primaryId = profile?.primary_family_id ?? null;

	return rows
		.map((row) => {
			const family = row.families && !Array.isArray(row.families) ? row.families : null;
			if (!family) return null;
			return {
				id: family.id,
				name: family.name,
				isCreator: row.role === 'creator',
				isPrimary: family.id === primaryId,
				memberCount: counts.get(family.id) ?? 1
			};
		})
		.filter((family): family is FamilySummary => family !== null)
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createFamily(
	supabase: AppSupabase,
	userId: string,
	rawName: unknown
): Promise<{ id: string } | { error: 'missing' | 'save_failed'; message?: string }> {
	const name = parseFamilyName(rawName);
	if (!name) return { error: 'missing' };

	const { data: family, error } = await supabase
		.from('families')
		.insert({ name, created_by: userId })
		.select('id')
		.single();

	if (error || !family) {
		return { error: 'save_failed', message: error?.message };
	}

	const { error: memberError } = await supabase.from('family_members').insert({
		family_id: family.id,
		user_id: userId,
		role: 'creator'
	});

	if (memberError) {
		await supabase.from('families').delete().eq('id', family.id);
		return { error: 'save_failed', message: memberError.message };
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('primary_family_id')
		.eq('id', userId)
		.maybeSingle();

	if (!profile?.primary_family_id) {
		await supabase.from('profiles').update({ primary_family_id: family.id }).eq('id', userId);
	}

	return { id: family.id };
}

export async function loadFamilyDetail(
	supabase: AppSupabase,
	userId: string,
	familyId: string
): Promise<
	| {
			family: FamilySummary;
			members: FamilyMember[];
			invite: FamilyInvite | null;
	  }
	| { error: 'not_found' }
> {
	const families = await listMyFamilies(supabase, userId);
	const family = families.find((item) => item.id === familyId);
	if (!family) return { error: 'not_found' };

	const { data: memberRows } = await supabase
		.from('family_members')
		.select('user_id, role, profiles(display_name)')
		.eq('family_id', familyId);

	const members: FamilyMember[] = (memberRows ?? []).map((row) => {
		const profile = row.profiles && !Array.isArray(row.profiles) ? row.profiles : null;
		return {
			userId: row.user_id,
			displayName: profile?.display_name ?? null,
			role: row.role === 'creator' ? 'creator' : 'member'
		};
	});

	let invite: FamilyInvite | null = null;
	if (family.isCreator) {
		const { data: inviteRow } = await supabase
			.from('family_invites')
			.select('token')
			.eq('family_id', familyId)
			.maybeSingle();

		if (inviteRow) {
			invite = { token: inviteRow.token, url: familyInvitePath(inviteRow.token) };
		}
	}

	return { family, members, invite };
}

export function familyInvitePath(token: string): string {
	return `/families/join/${token}`;
}

export function familyInviteUrl(origin: string, token: string): string {
	return `${origin}${familyInvitePath(token)}`;
}

export async function rotateFamilyInvite(
	supabase: AppSupabase,
	userId: string,
	familyId: string
): Promise<{ token: string } | { error: 'save_failed'; message?: string }> {
	const token = crypto.randomUUID().replaceAll('-', '');
	const { error } = await supabase.from('family_invites').upsert(
		{
			family_id: familyId,
			token,
			created_by: userId
		},
		{ onConflict: 'family_id' }
	);

	if (error) {
		return { error: 'save_failed', message: error.message };
	}

	return { token };
}

export async function peekFamilyInvite(
	supabase: AppSupabase,
	token: string
): Promise<{ familyId: string; familyName: string } | null> {
	const { data, error } = await supabase.rpc('peek_family_invite', { p_token: token });
	if (error || !data || data.length === 0) return null;
	const row = data[0];
	return { familyId: row.family_id, familyName: row.family_name };
}

export async function acceptFamilyInvite(
	supabase: AppSupabase,
	token: string
): Promise<{ id: string } | { error: 'invalid_invite' | 'save_failed'; message?: string }> {
	const { data, error } = await supabase.rpc('accept_family_invite', { p_token: token });
	if (error || !data) {
		if (error?.message?.includes('invalid_invite')) {
			return { error: 'invalid_invite' };
		}
		return { error: 'save_failed', message: error?.message };
	}
	return { id: data };
}

export async function setPrimaryFamily(
	supabase: AppSupabase,
	userId: string,
	familyId: string
): Promise<{ ok: true } | { error: 'forbidden' | 'save_failed'; message?: string }> {
	const { data: membership } = await supabase
		.from('family_members')
		.select('family_id')
		.eq('family_id', familyId)
		.eq('user_id', userId)
		.maybeSingle();

	if (!membership) return { error: 'forbidden' };

	const { error } = await supabase
		.from('profiles')
		.update({ primary_family_id: familyId })
		.eq('id', userId);

	if (error) return { error: 'save_failed', message: error.message };
	return { ok: true };
}

export async function leaveFamily(
	supabase: AppSupabase,
	userId: string,
	familyId: string
): Promise<{ ok: true } | { error: 'save_failed'; message?: string }> {
	const { error } = await supabase
		.from('family_members')
		.delete()
		.eq('family_id', familyId)
		.eq('user_id', userId);

	if (error) return { error: 'save_failed', message: error.message };
	return { ok: true };
}

export async function removeFamilyMember(
	supabase: AppSupabase,
	familyId: string,
	memberId: string
): Promise<{ ok: true } | { error: 'save_failed'; message?: string }> {
	const { error } = await supabase
		.from('family_members')
		.delete()
		.eq('family_id', familyId)
		.eq('user_id', memberId);

	if (error) return { error: 'save_failed', message: error.message };
	return { ok: true };
}

export async function deleteFamily(
	supabase: AppSupabase,
	familyId: string
): Promise<{ ok: true } | { error: 'save_failed'; message?: string }> {
	const { error } = await supabase.from('families').delete().eq('id', familyId);
	if (error) return { error: 'save_failed', message: error.message };
	return { ok: true };
}

export async function loadRecipeFamilyIds(
	supabase: AppSupabase,
	recipeId: string
): Promise<string[]> {
	const { data } = await supabase
		.from('recipe_family_shares')
		.select('family_id')
		.eq('recipe_id', recipeId);

	return (data ?? []).map((row) => row.family_id);
}

export async function replaceRecipeFamilyShares(
	supabase: AppSupabase,
	userId: string,
	recipeId: string,
	familyIds: string[]
): Promise<{ ok: true } | { error: 'forbidden' | 'save_failed'; message?: string }> {
	const allowed = new Set((await listMyFamilies(supabase, userId)).map((family) => family.id));
	const nextIds = [...new Set(familyIds.filter((id) => allowed.has(id)))];

	const { error: deleteError } = await supabase
		.from('recipe_family_shares')
		.delete()
		.eq('recipe_id', recipeId);

	if (deleteError) {
		return { error: 'save_failed', message: deleteError.message };
	}

	if (nextIds.length === 0) return { ok: true };

	const { error: insertError } = await supabase.from('recipe_family_shares').insert(
		nextIds.map((family_id) => ({
			recipe_id: recipeId,
			family_id
		}))
	);

	if (insertError) {
		return { error: 'save_failed', message: insertError.message };
	}

	return { ok: true };
}

export async function shareRecipeWithPrimaryFamily(
	supabase: AppSupabase,
	userId: string,
	recipeId: string
): Promise<void> {
	const { data: profile } = await supabase
		.from('profiles')
		.select('primary_family_id')
		.eq('id', userId)
		.maybeSingle();

	if (!profile?.primary_family_id) return;
	await replaceRecipeFamilyShares(supabase, userId, recipeId, [profile.primary_family_id]);
}

export async function isRecipeSharedWithUser(
	supabase: AppSupabase,
	recipeId: string,
	userId: string
): Promise<boolean> {
	const families = await listMyFamilies(supabase, userId);
	if (families.length === 0) return false;

	const { data } = await supabase
		.from('recipe_family_shares')
		.select('family_id')
		.eq('recipe_id', recipeId)
		.in(
			'family_id',
			families.map((family) => family.id)
		)
		.limit(1)
		.maybeSingle();

	return Boolean(data);
}

export async function loadFamilyRecipes(
	supabase: AppSupabase,
	familyId: string
): Promise<RecipeListResult> {
	const { data: shares, error } = await supabase
		.from('recipe_family_shares')
		.select(
			'recipe_id, recipes(id, title, summary, cover_path, is_public, allergens, course, effort, profiles(display_name))'
		)
		.eq('family_id', familyId);

	if (error) {
		return { items: [], error: error.message };
	}

	const items: RecipeListItem[] = [];

	for (const row of shares ?? []) {
		const recipe = row.recipes && !Array.isArray(row.recipes) ? row.recipes : null;
		if (!recipe) continue;

		items.push({
			id: recipe.id,
			title: recipe.title,
			summary: recipe.summary,
			coverUrl: coverPublicUrl(PUBLIC_SUPABASE_URL, recipe.cover_path),
			authorName:
				recipe.profiles && !Array.isArray(recipe.profiles) ? recipe.profiles.display_name : null,
			is_public: recipe.is_public,
			allergens: parseAllergens(recipe.allergens),
			course: parseRecipeCourse(recipe.course),
			effort: parseRecipeEffort(recipe.effort)
		});
	}

	return { error: null, items };
}
