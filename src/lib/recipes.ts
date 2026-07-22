import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { SupabaseClient } from '@supabase/supabase-js';
import { coverPublicUrl } from '$lib/markdown';
import type { Database } from '$lib/database.types';

export type RecipeListItem = {
	id: string;
	title: string;
	summary: string | null;
	coverUrl: string | null;
	authorName?: string | null;
	is_public?: boolean;
};

export type RecipeListResult = {
	items: RecipeListItem[];
	error: string | null;
};

type AppSupabase = SupabaseClient<Database>;

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

	return {
		error: null,
		items: (recipes ?? []).map((recipe) => ({
			id: recipe.id,
			title: recipe.title,
			summary: recipe.summary,
			coverUrl: coverPublicUrl(PUBLIC_SUPABASE_URL, recipe.cover_path),
			authorName:
				recipe.profiles && !Array.isArray(recipe.profiles)
					? recipe.profiles.display_name
					: null
		}))
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
