import { fail, redirect } from '@sveltejs/kit';
import { acceptFamilyInvite, peekFamilyInvite } from '$lib/families';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	if (!user) {
		redirect(303, `/login?redirectTo=/families/join/${params.token}`);
	}

	const peeked = await peekFamilyInvite(locals.supabase, params.token);
	return {
		token: params.token,
		familyName: peeked?.familyName ?? null,
		invalid: !peeked
	};
};

export const actions: Actions = {
	default: async ({ locals, params }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		if (!user) {
			return fail(401, { error: 'auth' });
		}

		const joined = await acceptFamilyInvite(locals.supabase, params.token);
		if ('error' in joined) {
			if (joined.error === 'invalid_invite') {
				return fail(404, { error: 'invalid_invite' });
			}
			return fail(500, { error: 'generic' });
		}

		redirect(303, `/families/${joined.id}`);
	}
};
