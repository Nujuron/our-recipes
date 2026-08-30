import { fail, redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { parseAllergens } from '$lib/allergens';
import { parseIngredientsJson } from '$lib/ingredients';
import { coverPublicUrl } from '$lib/cover';
import { updateRecipe } from '$lib/recipeMutations';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	if (!user) {
		redirect(303, `/login?redirectTo=/recipes/${params.id}/edit`);
	}

	const recipePromise = (async () => {
		const { data: recipe, error } = await locals.supabase
			.from('recipes')
			.select('*')
			.eq('id', params.id)
			.maybeSingle();

		if (error || !recipe) {
			redirect(303, '/me');
		}

		if (recipe.author_id !== user.id) {
			redirect(303, `/r/${recipe.id}`);
		}

		return {
			...recipe,
			ingredients: parseIngredientsJson(recipe.ingredients),
			allergens: parseAllergens(recipe.allergens),
			coverUrl: coverPublicUrl(PUBLIC_SUPABASE_URL, recipe.cover_path)
		};
	})();

	return {
		recipe: recipePromise
	};
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		if (!user) {
			return fail(401, { error: 'auth' });
		}

		const { data: current } = await locals.supabase
			.from('recipes')
			.select('id, cover_path, author_id')
			.eq('id', params.id)
			.maybeSingle();

		if (!current || current.author_id !== user.id) {
			return fail(403, { error: 'forbidden' });
		}

		const form = await request.formData();
		const cover = form.get('cover');

		let cover_path = current.cover_path;
		if (cover instanceof File && cover.size > 0) {
			const ext = cover.name.split('.').pop()?.toLowerCase() || 'jpg';
			const path = `${user.id}/${current.id}.${ext}`;
			const { error: uploadError } = await locals.supabase.storage
				.from('recipe-covers')
				.upload(path, cover, { upsert: true, contentType: cover.type || undefined });

			if (!uploadError) {
				cover_path = path;
			}
		}

		const saved = await updateRecipe(
			locals.supabase,
			user.id,
			current.id,
			{
				title: form.get('title'),
				summary: form.get('summary'),
				ingredients: form.get('ingredients'),
				steps: form.get('steps'),
				body_md: form.get('body_md'),
				locale: form.get('locale'),
				servings: form.get('servings'),
				allergens: form.getAll('allergens'),
				course: form.get('course'),
				effort: form.get('effort'),
				is_public: form.get('is_public')
			},
			{ cover_path }
		);

		if ('error' in saved) {
			if (saved.error === 'missing') {
				return fail(400, { error: 'missing' });
			}
			if (saved.error === 'forbidden' || saved.error === 'not_found') {
				return fail(403, { error: 'forbidden' });
			}
			return fail(500, { error: saved.message ?? 'save_failed' });
		}

		redirect(303, `/r/${current.id}`);
	},

	delete: async ({ locals, params }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		if (!user) {
			return fail(401, { error: 'auth' });
		}

		const { data: current } = await locals.supabase
			.from('recipes')
			.select('id, cover_path, author_id')
			.eq('id', params.id)
			.maybeSingle();

		if (!current || current.author_id !== user.id) {
			return fail(403, { error: 'forbidden' });
		}

		if (current.cover_path) {
			await locals.supabase.storage.from('recipe-covers').remove([current.cover_path]);
		}

		await locals.supabase.from('recipes').delete().eq('id', current.id);

		redirect(303, '/me');
	}
};
