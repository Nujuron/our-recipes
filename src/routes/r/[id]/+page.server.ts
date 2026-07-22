import { error, fail } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { parseIngredientLines } from '$lib/ingredients';
import { coverPublicUrl } from '$lib/cover';
import { renderMarkdown } from '$lib/markdown';
import { emptyRatingSummary, parseRatingInput, summaryFromStats } from '$lib/ratings';
import type { Actions, PageServerLoad } from './$types';

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
			recipe.profiles && !Array.isArray(recipe.profiles) ? recipe.profiles.display_name : null;

		const [{ data: stats }, userRatingResult] = await Promise.all([
			locals.supabase
				.from('recipe_rating_stats')
				.select('rating_sum, rating_count')
				.eq('recipe_id', recipe.id)
				.maybeSingle(),
			user
				? locals.supabase
						.from('recipe_ratings')
						.select('score, note')
						.eq('recipe_id', recipe.id)
						.eq('user_id', user.id)
						.maybeSingle()
				: Promise.resolve({ data: null, error: null })
		]);

		const ratingSummary = stats
			? summaryFromStats(stats.rating_sum, stats.rating_count)
			: emptyRatingSummary();

		const userRating = userRatingResult.data
			? {
					score: userRatingResult.data.score,
					note: userRatingResult.data.note
				}
			: null;

		const canRate = Boolean(user && recipe.is_public && recipe.author_id !== user.id);

		return {
			id: recipe.id,
			title: recipe.title,
			summary: recipe.summary,
			ingredients: parseIngredientLines(recipe.ingredients),
			coverUrl: coverPublicUrl(PUBLIC_SUPABASE_URL, recipe.cover_path),
			authorName,
			html: renderMarkdown(recipe.body_md),
			isPublic: recipe.is_public,
			canEdit: user?.id === recipe.author_id,
			canRate,
			isSignedIn: Boolean(user),
			isOwner: user?.id === recipe.author_id,
			ratingSummary,
			userRating
		};
	})();

	return {
		recipe: recipePromise
	};
};

export const actions: Actions = {
	rate: async ({ request, locals, params }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		if (!user) {
			return fail(401, { form: 'rate', error: 'auth' });
		}

		const form = await request.formData();
		const parsed = parseRatingInput(form.get('score'), form.get('note'));

		if (!parsed.ok) {
			return fail(400, { form: 'rate', error: parsed.error });
		}

		const { data: recipe, error: recipeError } = await locals.supabase
			.from('recipes')
			.select('id, is_public, author_id')
			.eq('id', params.id)
			.maybeSingle();

		if (recipeError || !recipe) {
			return fail(404, { form: 'rate', error: 'not_found' });
		}

		if (!recipe.is_public) {
			return fail(403, { form: 'rate', error: 'forbidden' });
		}

		if (recipe.author_id === user.id) {
			return fail(403, { form: 'rate', error: 'owner' });
		}

		const { error: upsertError } = await locals.supabase.from('recipe_ratings').upsert(
			{
				recipe_id: recipe.id,
				user_id: user.id,
				score: parsed.score,
				note: parsed.note
			},
			{ onConflict: 'recipe_id,user_id' }
		);

		if (upsertError) {
			return fail(500, { form: 'rate', error: 'generic' });
		}

		const { data: stats } = await locals.supabase
			.from('recipe_rating_stats')
			.select('rating_sum, rating_count')
			.eq('recipe_id', recipe.id)
			.maybeSingle();

		return {
			form: 'rate',
			success: true,
			userRating: {
				score: parsed.score,
				note: parsed.note
			},
			ratingSummary: stats
				? summaryFromStats(stats.rating_sum, stats.rating_count)
				: emptyRatingSummary()
		};
	}
};
