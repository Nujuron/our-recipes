import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '$lib/database.types';
import { parseIngredientsJson, parseServings, type RecipeIngredient } from '$lib/ingredients';
import { recipeEditPath, recipeEditUrl } from '$lib/paths';
import { normalizeSteps } from '$lib/steps';

export const RECIPE_TITLE_MAX = 160;
export const RECIPE_SUMMARY_MAX = 240;

const RECIPE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AppSupabase = SupabaseClient<Database>;

export type RecipeLocale = Database['public']['Tables']['recipes']['Row']['locale'];

export type RecipeWriteError = 'missing' | 'forbidden' | 'not_found' | 'save_failed';

export type RecipeWriteInput = {
	title?: unknown;
	summary?: unknown;
	ingredients?: unknown;
	steps?: unknown;
	body_md?: unknown;
	locale?: unknown;
	servings?: unknown;
	is_public?: unknown;
};

export type NormalizedRecipeFields = {
	title: string;
	summary: string | null;
	ingredients: RecipeIngredient[];
	steps: string | null;
	body_md: string;
	locale: RecipeLocale;
	servings: number;
	is_public: boolean;
};

export type OwnedRecipeSummary = {
	id: string;
	title: string;
	summary: string | null;
	is_public: boolean;
	updated_at: string;
	editPath: string;
	editUrl?: string;
};

export type OwnedRecipeDetail = NormalizedRecipeFields & {
	id: string;
	author_id: string;
	updated_at: string;
	created_at: string;
	editPath: string;
	editUrl?: string;
};

export function isRecipeId(value: string): boolean {
	return RECIPE_ID.test(value);
}

export function parseRecipeLocale(raw: unknown): RecipeLocale {
	const value = String(raw ?? 'en');
	if (value === 'es' || value === 'de' || value === 'other' || value === 'en') {
		return value;
	}
	return 'en';
}

function parsePublicFlag(raw: unknown): boolean {
	if (raw === true || raw === 'on' || raw === 'true') return true;
	return false;
}

function parseSteps(raw: unknown): string | null {
	if (Array.isArray(raw)) {
		return normalizeSteps(raw.map((line) => String(line ?? '')).join('\n'));
	}
	return normalizeSteps(String(raw ?? ''));
}

export function normalizeRecipeWrite(
	input: RecipeWriteInput,
	defaults?: NormalizedRecipeFields | null
): { ok: true; fields: NormalizedRecipeFields } | { ok: false; error: 'missing' } {
	const titleSource = input.title !== undefined ? input.title : defaults?.title;
	const bodySource = input.body_md !== undefined ? input.body_md : defaults?.body_md;
	const servingsSource = input.servings !== undefined ? input.servings : defaults?.servings;

	const title = String(titleSource ?? '')
		.trim()
		.slice(0, RECIPE_TITLE_MAX);
	const body_md = String(bodySource ?? '').trim();
	const servings = parseServings(servingsSource);

	if (!title || !body_md || servings == null) {
		return { ok: false, error: 'missing' };
	}

	const summarySource = input.summary !== undefined ? input.summary : defaults?.summary;
	const summary = String(summarySource ?? '')
		.trim()
		.slice(0, RECIPE_SUMMARY_MAX);

	const ingredients =
		input.ingredients !== undefined
			? parseIngredientsJson(input.ingredients)
			: (defaults?.ingredients ?? []);

	const steps = input.steps !== undefined ? parseSteps(input.steps) : (defaults?.steps ?? null);
	const locale =
		input.locale !== undefined ? parseRecipeLocale(input.locale) : (defaults?.locale ?? 'en');
	const is_public =
		input.is_public !== undefined
			? parsePublicFlag(input.is_public)
			: (defaults?.is_public ?? false);

	return {
		ok: true,
		fields: {
			title,
			summary: summary || null,
			ingredients,
			steps,
			body_md,
			locale,
			servings,
			is_public
		}
	};
}

function toRow(fields: NormalizedRecipeFields) {
	return {
		title: fields.title,
		summary: fields.summary,
		ingredients: fields.ingredients as Json,
		steps: fields.steps,
		body_md: fields.body_md,
		locale: fields.locale,
		servings: fields.servings,
		is_public: fields.is_public
	};
}

export async function createRecipe(
	supabase: AppSupabase,
	userId: string,
	input: RecipeWriteInput,
	options?: { forcePrivate?: boolean }
): Promise<{ id: string } | { error: RecipeWriteError; message?: string }> {
	const normalized = normalizeRecipeWrite(input);
	if (!normalized.ok) return { error: normalized.error };

	const fields = options?.forcePrivate
		? { ...normalized.fields, is_public: false }
		: normalized.fields;

	const { data: recipe, error } = await supabase
		.from('recipes')
		.insert({
			author_id: userId,
			...toRow(fields)
		})
		.select('id')
		.single();

	if (error || !recipe) {
		return { error: 'save_failed', message: error?.message };
	}

	return { id: recipe.id };
}

export async function updateRecipe(
	supabase: AppSupabase,
	userId: string,
	recipeId: string,
	input: RecipeWriteInput,
	options?: { forcePrivate?: boolean; cover_path?: string | null }
): Promise<{ id: string } | { error: RecipeWriteError; message?: string }> {
	if (!isRecipeId(recipeId)) {
		return { error: 'not_found' };
	}

	const current = await getOwnedRecipe(supabase, userId, recipeId);
	if ('error' in current) return current;

	const normalized = normalizeRecipeWrite(input, current);
	if (!normalized.ok) return { error: normalized.error };

	const fields = options?.forcePrivate
		? { ...normalized.fields, is_public: false }
		: normalized.fields;

	const patch = {
		...toRow(fields),
		...(options && 'cover_path' in options ? { cover_path: options.cover_path ?? null } : {})
	};

	const { error } = await supabase
		.from('recipes')
		.update(patch)
		.eq('id', recipeId)
		.eq('author_id', userId);

	if (error) {
		return { error: 'save_failed', message: error.message };
	}

	return { id: recipeId };
}

export async function getOwnedRecipe(
	supabase: AppSupabase,
	userId: string,
	recipeId: string,
	origin?: string
): Promise<OwnedRecipeDetail | { error: Exclude<RecipeWriteError, 'missing' | 'save_failed'> }> {
	if (!isRecipeId(recipeId)) {
		return { error: 'not_found' };
	}

	const { data: recipe, error } = await supabase
		.from('recipes')
		.select(
			'id, author_id, title, summary, ingredients, steps, body_md, locale, servings, is_public, created_at, updated_at'
		)
		.eq('id', recipeId)
		.maybeSingle();

	if (error || !recipe) {
		return { error: 'not_found' };
	}

	if (recipe.author_id !== userId) {
		return { error: 'forbidden' };
	}

	const detail: OwnedRecipeDetail = {
		id: recipe.id,
		author_id: recipe.author_id,
		title: recipe.title,
		summary: recipe.summary,
		ingredients: parseIngredientsJson(recipe.ingredients),
		steps: recipe.steps,
		body_md: recipe.body_md,
		locale: recipe.locale,
		servings: recipe.servings,
		is_public: recipe.is_public,
		created_at: recipe.created_at,
		updated_at: recipe.updated_at,
		editPath: recipeEditPath(recipe.id),
		editUrl: origin ? recipeEditUrl(origin, recipe.id) : undefined
	};

	return detail;
}

export async function listOwnedRecipes(
	supabase: AppSupabase,
	userId: string,
	q?: string,
	origin?: string
): Promise<{ items: OwnedRecipeSummary[] } | { error: string }> {
	let query = supabase
		.from('recipes')
		.select('id, title, summary, is_public, updated_at')
		.eq('author_id', userId)
		.order('updated_at', { ascending: false });

	const filter = q?.trim();
	if (filter) {
		query = query.ilike('title', `%${filter}%`);
	}

	const { data, error } = await query;

	if (error) {
		return { error: error.message };
	}

	return {
		items: (data ?? []).map((recipe) => ({
			id: recipe.id,
			title: recipe.title,
			summary: recipe.summary,
			is_public: recipe.is_public,
			updated_at: recipe.updated_at,
			editPath: recipeEditPath(recipe.id),
			editUrl: origin ? recipeEditUrl(origin, recipe.id) : undefined
		}))
	};
}
