import { fail, redirect } from '@sveltejs/kit';
import {
	decideAuthorization,
	getAuthorizationDetails,
	isAuthorizationDetails
} from '$lib/server/oauthConsent';
import type { Actions, PageServerLoad } from './$types';

function consentLoginPath(authorizationId: string): string {
	return `/login?redirectTo=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const authorizationId = url.searchParams.get('authorization_id')?.trim() ?? '';

	if (!authorizationId) {
		return { status: 'missing' as const };
	}

	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	if (!user) {
		redirect(303, consentLoginPath(authorizationId));
	}

	const { data, error } = await getAuthorizationDetails(locals.supabase, authorizationId);

	if (error || !data) {
		return {
			status: 'error' as const,
			message: error?.message ?? 'invalid'
		};
	}

	if (!isAuthorizationDetails(data)) {
		redirect(303, data.redirect_url);
	}

	return {
		status: 'consent' as const,
		authorizationId: data.authorization_id,
		clientName: data.client.name || data.client.id || 'AI app',
		scopes: data.scope?.trim() ? data.scope.split(/\s+/).filter(Boolean) : []
	};
};

export const actions: Actions = {
	approve: async ({ locals, request }) => {
		return decide(locals, request, 'approve');
	},
	deny: async ({ locals, request }) => {
		return decide(locals, request, 'deny');
	}
};

async function decide(locals: App.Locals, request: Request, action: 'approve' | 'deny') {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	const form = await request.formData();
	const authorizationId = String(form.get('authorization_id') ?? '').trim();

	if (!user) {
		if (!authorizationId) {
			return fail(401, { error: 'auth' });
		}
		redirect(303, consentLoginPath(authorizationId));
	}

	if (!authorizationId) {
		return fail(400, { error: 'missing' });
	}

	const { data, error } = await decideAuthorization(locals.supabase, authorizationId, action);

	if (error || !data?.redirect_url) {
		return fail(400, { error: error?.message ?? 'decision_failed' });
	}

	redirect(303, data.redirect_url);
}
