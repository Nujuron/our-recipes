import { error, fail, redirect } from '@sveltejs/kit';
import { isLocale, type Locale } from '$lib/paraglide/runtime';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	if (!user) {
		redirect(303, '/login?redirectTo=/me/profile');
	}

	const pagePromise = (async () => {
		const { data: profile, error: profileError } = await locals.supabase
			.from('profiles')
			.select('display_name, preferred_locale, avatar_url')
			.eq('id', user.id)
			.maybeSingle();

		if (profileError || !profile) {
			error(500, 'profile_missing');
		}

		return {
			email: user.email ?? '',
			profile
		};
	})();

	return {
		page: pagePromise
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		if (!user) {
			return fail(401, { error: 'auth', displayName: '', preferred_locale: '' });
		}

		const form = await request.formData();
		const displayName = String(form.get('displayName') ?? '').trim();
		const preferredRaw = String(form.get('preferred_locale') ?? '');

		if (!isLocale(preferredRaw)) {
			return fail(400, {
				error: 'invalid_locale',
				displayName,
				preferred_locale: preferredRaw
			});
		}

		const preferred_locale: Locale = preferredRaw;

		const { error: updateError } = await locals.supabase
			.from('profiles')
			.update({
				display_name: displayName || null,
				preferred_locale
			})
			.eq('id', user.id);

		if (updateError) {
			return fail(500, {
				error: updateError.message,
				displayName,
				preferred_locale
			});
		}

		redirect(303, '/me/profile?saved=1');
	}
};
