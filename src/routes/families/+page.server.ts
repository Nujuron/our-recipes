import { fail, redirect } from '@sveltejs/kit';
import { createFamily, listMyFamilies } from '$lib/families';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	if (!user) {
		redirect(303, '/login?redirectTo=/families');
	}

	return {
		families: listMyFamilies(locals.supabase, user.id)
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		if (!user) {
			return fail(401, { form: 'create', error: 'auth' });
		}

		const form = await request.formData();
		const created = await createFamily(locals.supabase, user.id, form.get('name'));

		if ('error' in created) {
			if (created.error === 'missing') {
				return fail(400, { form: 'create', error: 'missing' });
			}
			return fail(500, { form: 'create', error: 'generic' });
		}

		redirect(303, `/families/${created.id}`);
	}
};
