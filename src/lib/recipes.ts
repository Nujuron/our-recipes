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
