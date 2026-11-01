import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';
import { listMyFamilies } from '$lib/families';
import { pantryCounts, pantryToday, rankPantryRecipes, validTimezone } from '$lib/pantry';
import { toPostgresArrayLiteral } from '$lib/allergens';
import type { ParsedRecipeListFilters } from '$lib/recipes';

type AppSupabase = SupabaseClient<Database>;

export async function loadPantryOverview(
	supabase: AppSupabase,
	userId: string,
	selectedId: string | null
) {
	const [pantriesResult, families] = await Promise.all([
		supabase.from('pantries').select('*').order('created_at'),
		listMyFamilies(supabase, userId)
	]);
	if (pantriesResult.error) throw new Error('pantry_load_failed');
	const pantries = pantriesResult.data;
	const pantry =
		pantries.find((p) => p.id === selectedId) ??
		pantries.find((p) => p.owner_user_id === userId) ??
		pantries[0] ??
		null;
	const lotsResult = pantry
		? await supabase
				.from('pantry_lots')
				.select('*')
				.eq('pantry_id', pantry.id)
				.order('food_date', { nullsFirst: false })
		: { data: [], error: null };
	if (lotsResult.error) throw new Error('pantry_load_failed');
	return {
		pantries,
		pantry,
		lots: lotsResult.data ?? [],
		families,
		hasPersonal: pantries.some((p) => p.owner_user_id === userId)
	};
}

export async function createPantry(
	supabase: AppSupabase,
	userId: string,
	name: string,
	timezone: string,
	familyId: string | null
) {
	if (!name.trim() || name.trim().length > 80 || !validTimezone(timezone))
		return { error: 'invalid' as const };
	const result = await supabase
		.from('pantries')
		.insert({
			name: name.trim(),
			timezone,
			owner_user_id: familyId ? null : userId,
			family_id: familyId
		})
		.select('id')
		.single();
	if (result.error?.code === '23505') {
		// Concurrent first visits must reuse the same personal/family pantry.
		const existing = await (
			familyId
				? supabase.from('pantries').select('id').eq('family_id', familyId)
				: supabase.from('pantries').select('id').eq('owner_user_id', userId)
		).maybeSingle();
		if (existing.data) return { id: existing.data.id };
	}
	return result.error || !result.data ? { error: 'generic' as const } : { id: result.data.id };
}

export async function loadPantrySummary(supabase: AppSupabase) {
	const { data: pantries, error } = await supabase.from('pantries').select('*');
	if (error) return null;
	const { data: lots, error: lotError } = await supabase
		.from('pantry_lots')
		.select('*')
		.eq('status', 'active');
	if (lotError) return null;
	return (pantries ?? []).map((pantry) => ({
		pantry,
		today: pantryToday(pantry.timezone),
		...pantryCounts(
			(lots ?? []).filter((l) => l.pantry_id === pantry.id),
			pantry
		)
	}));
}

export async function loadPantrySuggestions(
	supabase: AppSupabase,
	pantryId: string | null,
	ingredient: string,
	filters: ParsedRecipeListFilters
) {
	if (!pantryId) return null;
	const { data: pantry, error } = await supabase
		.from('pantries')
		.select('*')
		.eq('id', pantryId)
		.maybeSingle();
	if (error || !pantry) return null;
	const { data: lots, error: lotError } = await supabase
		.from('pantry_lots')
		.select('*')
		.eq('pantry_id', pantry.id)
		.eq('status', 'active');
	if (lotError) throw new Error('pantry_load_failed');
	// The authenticated client preserves existing own/public/family recipe visibility.
	const recipes: Pick<
		Database['public']['Tables']['recipes']['Row'],
		'id' | 'title' | 'ingredients' | 'allergens' | 'course' | 'effort'
	>[] = [];
	// Fetch all accessible candidates in pages rather than silently ranking a truncated first page.
	for (let offset = 0; ; offset += 500) {
		let query = supabase
			.from('recipes')
			.select('id, title, ingredients, allergens, course, effort')
			.order('id')
			.range(offset, offset + 499);
		if (filters.course) query = query.eq('course', filters.course);
		if (filters.effort) query = query.eq('effort', filters.effort);
		if (filters.excludeAllergens.length)
			query = query.not('allergens', 'ov', toPostgresArrayLiteral(filters.excludeAllergens));
		const { data, error } = await query;
		if (error) throw new Error('pantry_load_failed');
		recipes.push(...data);
		if (data.length < 500) break;
	}
	return {
		pantry,
		today: pantryToday(pantry.timezone),
		items: rankPantryRecipes(
			recipes,
			lots ?? [],
			pantryToday(pantry.timezone),
			pantry.warning_days,
			ingredient || undefined
		)
	};
}
