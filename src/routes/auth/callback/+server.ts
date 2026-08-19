import { redirect } from '@sveltejs/kit';
import { isSafeInternalPath } from '$lib/paths';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') ?? '/me';

	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			redirect(303, isSafeInternalPath(next) ? next : '/me');
		}
	}

	redirect(303, '/login');
};
