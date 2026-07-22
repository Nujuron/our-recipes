import { fail, redirect } from '@sveltejs/kit';
import { isLocale, type Locale } from '$lib/paraglide/runtime';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	if (user) {
		redirect(303, '/me');
	}

	return {
		redirectTo: url.searchParams.get('redirectTo') ?? '/me',
		mode: url.searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
	};
};

function readAuthFields(form: FormData) {
	const email = String(form.get('email') ?? '')
		.trim()
		.toLowerCase();
	const password = String(form.get('password') ?? '');
	const displayName = String(form.get('displayName') ?? '').trim();
	const redirectTo = String(form.get('redirectTo') || '/me');
	const localeRaw = String(form.get('preferred_locale') ?? 'en');
	const preferred_locale: Locale = isLocale(localeRaw) ? localeRaw : 'en';

	return { email, password, displayName, redirectTo, preferred_locale };
}

export const actions: Actions = {
	signin: async ({ locals, request }) => {
		const { email, password, redirectTo } = readAuthFields(await request.formData());

		if (!email || !password) {
			return fail(400, { mode: 'signin', error: 'missing', email });
		}

		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });

		if (error) {
			return fail(400, { mode: 'signin', error: error.message, email });
		}

		redirect(303, redirectTo.startsWith('/') ? redirectTo : '/me');
	},

	signup: async ({ locals, request }) => {
		const { email, password, displayName, redirectTo, preferred_locale } = readAuthFields(
			await request.formData()
		);

		if (!email || !password) {
			return fail(400, { mode: 'signup', error: 'missing', email, displayName });
		}

		if (password.length < 6) {
			return fail(400, { mode: 'signup', error: 'weak_password', email, displayName });
		}

		const { data, error } = await locals.supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					full_name: displayName || email.split('@')[0],
					preferred_locale
				}
			}
		});

		if (error) {
			return fail(400, { mode: 'signup', error: error.message, email, displayName });
		}

		if (data.user) {
			await locals.supabase
				.from('profiles')
				.update({ preferred_locale })
				.eq('id', data.user.id);
		}

		// When email confirmation is enabled, there is no session yet.
		if (!data.session) {
			return {
				mode: 'signup',
				email,
				needsConfirmation: true
			};
		}

		redirect(303, redirectTo.startsWith('/') ? redirectTo : '/me');
	},

	google: async ({ locals, url, request }) => {
		const form = await request.formData();
		const redirectTo = String(form.get('redirectTo') || '/me');
		const callback = new URL('/auth/callback', url.origin);
		callback.searchParams.set('next', redirectTo);

		const { data, error } = await locals.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: callback.toString()
			}
		});

		if (error || !data.url) {
			return fail(400, {
				mode: 'signin',
				error: error?.message ?? 'Unable to start Google sign-in'
			});
		}

		redirect(303, data.url);
	}
};
