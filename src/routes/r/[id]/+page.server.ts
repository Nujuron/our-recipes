import { error } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { parseIngredientLines } from '$lib/ingredients';
import { coverPublicUrl, renderMarkdown } from '$lib/markdown';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const recipePromise = (async () => {
		const { data: recipe, error: queryError } = await locals.supabase
			.from('recipes')
			.select(
				'id, title, summary, ingredients, body_md, cover_path, is_public, author_id, profiles(display_name)'
			)
			.eq('id', params.id)
			.maybeSingle();

		if (queryError || !recipe) {
			error(404, 'not_found');
		}

		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		if (!recipe.is_public && recipe.author_id !== user?.id) {
			error(404, 'not_found');
		}

		const authorName =
			recipe.profiles && !Array.isArray(recipe.profiles)
				? recipe.profiles.display_name
				: null;

		return {
			id: recipe.id,
			title: recipe.title,
			summary: recipe.summary,
			ingredients: parseIngredientLines(recipe.ingredients),
			coverUrl: coverPublicUrl(PUBLIC_SUPABASE_URL, recipe.cover_path),
			authorName,
			html: renderMarkdown(recipe.body_md),
			isPublic: recipe.is_public,
			canEdit: user?.id === recipe.author_id
		};
	})();

	return {
		recipe: recipePromise
	};
};
