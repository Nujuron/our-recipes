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

		const hasGoogle = (user.identities ?? []).some((identity) => identity.provider === 'google');

		return {
			email: user.email ?? '',
			hasGoogle,
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
			return fail(401, {
				form: 'profile' as const,
				error: 'auth',
				displayName: '',
				preferred_locale: ''
			});
		}

		const form = await request.formData();
		const displayName = String(form.get('displayName') ?? '').trim();
		const preferredRaw = String(form.get('preferred_locale') ?? '');

		if (!isLocale(preferredRaw)) {
			return fail(400, {
				form: 'profile' as const,
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
				form: 'profile' as const,
				error: updateError.message,
				displayName,
				preferred_locale
			});
		}

		redirect(303, '/me/profile?saved=1');
	},

	changePassword: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		if (!user?.email) {
			return fail(401, { form: 'password' as const, error: 'auth' });
		}

		const form = await request.formData();
		const currentPassword = String(form.get('currentPassword') ?? '');
		const newPassword = String(form.get('newPassword') ?? '');
		const confirmPassword = String(form.get('confirmPassword') ?? '');

		if (!currentPassword || !newPassword || !confirmPassword) {
			return fail(400, { form: 'password' as const, error: 'password_missing' });
		}

		if (newPassword.length < 6) {
			return fail(400, { form: 'password' as const, error: 'weak_password' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { form: 'password' as const, error: 'password_mismatch' });
		}

		const { error: verifyError } = await locals.supabase.auth.signInWithPassword({
			email: user.email,
			password: currentPassword
		});

		if (verifyError) {
			return fail(400, { form: 'password' as const, error: 'password_incorrect' });
		}

		const { error: updateError } = await locals.supabase.auth.updateUser({
			password: newPassword
		});

		if (updateError) {
			return fail(400, {
				form: 'password' as const,
				error: updateError.message
			});
		}

		redirect(303, '/me/profile?password=1');
	},

	linkGoogle: async ({ locals, url }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();

		if (!user) {
			return fail(401, { form: 'google' as const, error: 'auth' });
		}

		const alreadyLinked = (user.identities ?? []).some(
			(identity) => identity.provider === 'google'
		);

		if (alreadyLinked) {
			redirect(303, '/me/profile?google=1');
		}

		const callback = new URL('/auth/callback', url.origin);
		callback.searchParams.set('next', '/me/profile?google=1');

		const { data, error: linkError } = await locals.supabase.auth.linkIdentity({
			provider: 'google',
			options: {
				redirectTo: callback.toString()
			}
		});

		if (linkError || !data.url) {
			return fail(400, {
				form: 'google' as const,
				error: linkError?.message ?? 'Unable to start Google linking'
			});
		}

		redirect(303, data.url);
	}
};
