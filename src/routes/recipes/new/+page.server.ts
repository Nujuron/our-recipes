import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { normalizeIngredients } from '$lib/ingredients';

export const load: PageServerLoad = async ({ locals }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	if (!user) {
		redirect(303, '/login?redirectTo=/recipes/new');
	}

	const defaultLocalePromise = (async () => {
		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('preferred_locale')
			.eq('id', user.id)
			.maybeSingle();

		return profile?.preferred_locale ?? 'en';
	})();

	return {
		defaultLocale: defaultLocalePromise
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		if (!user) {
			return fail(401, { error: 'auth' });
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

		const { data: recipe, error } = await locals.supabase
			.from('recipes')
			.insert({
				author_id: user.id,
				title,
				summary: summary || null,
				ingredients,
				body_md,
				locale,
				is_public
			})
			.select('id')
			.single();

		if (error || !recipe) {
			return fail(500, { error: error?.message ?? 'save_failed' });
		}

		if (cover instanceof File && cover.size > 0) {
			const ext = cover.name.split('.').pop()?.toLowerCase() || 'jpg';
			const path = `${user.id}/${recipe.id}.${ext}`;
			const { error: uploadError } = await locals.supabase.storage
				.from('recipe-covers')
				.upload(path, cover, { upsert: true, contentType: cover.type || undefined });

			if (!uploadError) {
				await locals.supabase.from('recipes').update({ cover_path: path }).eq('id', recipe.id);
			}
		}

		redirect(303, `/recipes/${recipe.id}/edit`);
	}
};
