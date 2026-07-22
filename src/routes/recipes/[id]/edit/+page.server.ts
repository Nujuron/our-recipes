import { fail, redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { normalizeIngredients } from '$lib/ingredients';
import { coverPublicUrl } from '$lib/markdown';
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
		const title = String(form.get('title') ?? '').trim();
		const summary = String(form.get('summary') ?? '').trim();
		const ingredients = normalizeIngredients(String(form.get('ingredients') ?? ''));
		const body_md = String(form.get('body_md') ?? '').trim();
		const localeRaw = String(form.get('locale') ?? 'en');
		const locale =
			localeRaw === 'es' || localeRaw === 'de' || localeRaw === 'other' || localeRaw === 'en'
				? localeRaw
				: 'en';
		const is_public = form.get('is_public') === 'on';
		const cover = form.get('cover');

		if (!title || !body_md) {
			return fail(400, { error: 'missing' });
		}

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

		const { error } = await locals.supabase
			.from('recipes')
			.update({
				title,
				summary: summary || null,
				ingredients,
				body_md,
				locale,
				is_public,
				cover_path
			})
			.eq('id', current.id);

		if (error) {
			return fail(500, { error: error.message });
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
