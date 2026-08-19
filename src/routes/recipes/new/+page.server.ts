import { fail, redirect } from '@sveltejs/kit';
import { createRecipe } from '$lib/recipeMutations';
import type { Actions, PageServerLoad } from './$types';

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
		const created = await createRecipe(locals.supabase, user.id, {
			title: form.get('title'),
			summary: form.get('summary'),
			ingredients: form.get('ingredients'),
			steps: form.get('steps'),
			body_md: form.get('body_md'),
			locale: form.get('locale'),
			servings: form.get('servings'),
			is_public: form.get('is_public')
		});

		if ('error' in created) {
			if (created.error === 'missing') {
				return fail(400, { error: 'missing' });
			}
			return fail(500, { error: created.message ?? 'save_failed' });
		}

		const cover = form.get('cover');
		if (cover instanceof File && cover.size > 0) {
			const ext = cover.name.split('.').pop()?.toLowerCase() || 'jpg';
			const path = `${user.id}/${created.id}.${ext}`;
			const { error: uploadError } = await locals.supabase.storage
				.from('recipe-covers')
				.upload(path, cover, { upsert: true, contentType: cover.type || undefined });

			if (!uploadError) {
				await locals.supabase.from('recipes').update({ cover_path: path }).eq('id', created.id);
			}
		}

		redirect(303, `/recipes/${created.id}/edit`);
	}
};
