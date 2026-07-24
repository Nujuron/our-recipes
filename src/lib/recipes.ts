import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { SupabaseClient } from '@supabase/supabase-js';
import { coverPublicUrl } from '$lib/cover';
import type { Database } from '$lib/database.types';
import { emptyRatingSummary, summaryFromStats, type RatingSummary } from '$lib/ratings';

export type RecipeListItem = {
	id: string;
	title: string;
	summary: string | null;
	coverUrl: string | null;
	authorName?: string | null;
	is_public?: boolean;
	ratingAverage?: number | null;
	ratingCount?: number;
};

export type RecipeListResult = {
	items: RecipeListItem[];
	error: string | null;
};

type AppSupabase = SupabaseClient<Database>;

async function loadRatingSummaries(
	supabase: AppSupabase,
	recipeIds: string[]
): Promise<Map<string, RatingSummary>> {
	const summaries = new Map<string, RatingSummary>();
	if (recipeIds.length === 0) return summaries;

	const { data, error } = await supabase
		.from('recipe_rating_stats')
		.select('recipe_id, rating_sum, rating_count')
		.in('recipe_id', recipeIds);

	if (error) {
		return summaries;
	}

	for (const row of data ?? []) {
		summaries.set(row.recipe_id, summaryFromStats(row.rating_sum, row.rating_count));
	}

	return summaries;
}

export async function loadPublicRecipes(
	supabase: AppSupabase,
	q: string
): Promise<RecipeListResult> {
	let query = supabase
		.from('recipes')
		.select('id, title, summary, cover_path, created_at, profiles(display_name)')
		.eq('is_public', true)
		.order('created_at', { ascending: false })
		.limit(24);

	if (q) {
		query = query.ilike('title', `%${q}%`);
	}

	const { data: recipes, error } = await query;

	if (error) {
		return { items: [], error: error.message };
	}

	const recipeRows = recipes ?? [];
	const summaries = await loadRatingSummaries(
		supabase,
		recipeRows.map((recipe) => recipe.id)
	);

	return {
		error: null,
		items: recipeRows.map((recipe) => {
			const summary = summaries.get(recipe.id) ?? emptyRatingSummary();
			return {
				id: recipe.id,
				title: recipe.title,
				summary: recipe.summary,
				coverUrl: coverPublicUrl(PUBLIC_SUPABASE_URL, recipe.cover_path),
				authorName:
					recipe.profiles && !Array.isArray(recipe.profiles) ? recipe.profiles.display_name : null,
				ratingAverage: summary.average,
				ratingCount: summary.count
			};
		})
	};
}

export async function loadMyRecipes(
	supabase: AppSupabase,
	userId: string
): Promise<RecipeListResult> {
	const { data: recipes, error } = await supabase
		.from('recipes')
		.select('id, title, summary, cover_path, is_public, updated_at')
		.eq('author_id', userId)
		.order('updated_at', { ascending: false });

	if (error) {
		return { items: [], error: error.message };
	}

	return {
		error: null,
		items: (recipes ?? []).map((recipe) => ({
			id: recipe.id,
			title: recipe.title,
			summary: recipe.summary,
			coverUrl: coverPublicUrl(PUBLIC_SUPABASE_URL, recipe.cover_path),
			is_public: recipe.is_public
		}))
	};
}

const TITLE_MAX = 160;

function duplicatedTitle(title: string): string {
	const suffix = ' (copy)';
	if (title.length + suffix.length <= TITLE_MAX) return `${title}${suffix}`;
	return `${title.slice(0, TITLE_MAX - suffix.length).trimEnd()}${suffix}`;
}

function extensionFromCoverPath(coverPath: string, contentType: string | null): string {
	const fromPath = coverPath.split('.').pop()?.toLowerCase();
	if (fromPath && /^[a-z0-9]+$/.test(fromPath) && fromPath.length <= 5) return fromPath;
	if (contentType?.includes('png')) return 'png';
	if (contentType?.includes('webp')) return 'webp';
	if (contentType?.includes('gif')) return 'gif';
	return 'jpg';
}

/**
 * Copy a visible public recipe into the current user's account as a private draft.
 * Cover is re-uploaded via the public URL so storage RLS (own-folder only) is satisfied.
 */
export async function duplicateRecipe(
	supabase: AppSupabase,
	sourceId: string,
	userId: string
): Promise<{ id: string } | { error: string }> {
	const { data: source, error: sourceError } = await supabase
		.from('recipes')
		.select('id, title, summary, ingredients, steps, body_md, cover_path, locale, is_public, author_id')
		.eq('id', sourceId)
		.maybeSingle();

	if (sourceError || !source) {
		return { error: 'not_found' };
	}

	if (!source.is_public && source.author_id !== userId) {
		return { error: 'forbidden' };
	}

	const { data: created, error: insertError } = await supabase
		.from('recipes')
		.insert({
			author_id: userId,
			title: duplicatedTitle(source.title),
			summary: source.summary,
			ingredients: source.ingredients,
			steps: source.steps,
			body_md: source.body_md,
			locale: source.locale,
			is_public: false
		})
		.select('id')
		.single();

	if (insertError || !created) {
		return { error: insertError?.message ?? 'save_failed' };
	}

	if (source.cover_path) {
		try {
			const coverUrl = coverPublicUrl(PUBLIC_SUPABASE_URL, source.cover_path);
			if (coverUrl) {
				const response = await fetch(coverUrl);
				if (response.ok) {
					const blob = await response.blob();
					const ext = extensionFromCoverPath(source.cover_path, blob.type);
					const path = `${userId}/${created.id}.${ext}`;
					const { error: uploadError } = await supabase.storage
						.from('recipe-covers')
						.upload(path, blob, {
							upsert: true,
							contentType: blob.type || undefined
						});

					if (!uploadError) {
						await supabase.from('recipes').update({ cover_path: path }).eq('id', created.id);
					}
				}
			}
		} catch {
			// Keep the duplicate even if cover copy fails; user can replace it in the editor.
		}
	}

	return { id: created.id };
}

export type CookedRecipeListItem = {
	id: string;
	title: string;
	summary: string | null;
	coverUrl: string | null;
	authorName: string | null;
	myScore: number;
	cookedAt: string;
};

export type CookedRecipeListResult = {
	items: CookedRecipeListItem[];
	error: string | null;
};

export async function loadCookedRecipes(
	supabase: AppSupabase,
	userId: string
): Promise<CookedRecipeListResult> {
	const { data, error } = await supabase
		.from('recipe_ratings')
		.select(
			'score, updated_at, recipes(id, title, summary, cover_path, profiles(display_name))'
		)
		.eq('user_id', userId)
		.order('updated_at', { ascending: false });

	if (error) {
		return { items: [], error: error.message };
	}

	const items: CookedRecipeListItem[] = [];

	for (const row of data ?? []) {
		const recipe = row.recipes && !Array.isArray(row.recipes) ? row.recipes : null;
		if (!recipe) continue;

		const authorName =
			recipe.profiles && !Array.isArray(recipe.profiles) ? recipe.profiles.display_name : null;

		items.push({
			id: recipe.id,
			title: recipe.title,
			summary: recipe.summary,
			coverUrl: coverPublicUrl(PUBLIC_SUPABASE_URL, recipe.cover_path),
			authorName,
			myScore: row.score,
			cookedAt: row.updated_at
		});
	}

	return { error: null, items };
}
