import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

export type OAuthClientDetails = {
	id?: string;
	name?: string;
	uri?: string;
	logo_uri?: string;
};

export type OAuthAuthorizationDetails = {
	authorization_id: string;
	redirect_uri?: string;
	scope?: string;
	client: OAuthClientDetails;
};

export type OAuthAuthorizationRedirect = {
	redirect_url: string;
};

export type OAuthAuthorizationResult = OAuthAuthorizationDetails | OAuthAuthorizationRedirect;

type AppSupabase = SupabaseClient<Database>;

type SdkOauth = {
	getAuthorizationDetails: (
		id: string
	) => Promise<{ data: OAuthAuthorizationResult | null; error: { message: string } | null }>;
	approveAuthorization: (
		id: string
	) => Promise<{ data: OAuthAuthorizationRedirect | null; error: { message: string } | null }>;
	denyAuthorization: (
		id: string
	) => Promise<{ data: OAuthAuthorizationRedirect | null; error: { message: string } | null }>;
};

function sdkOauth(supabase: AppSupabase): SdkOauth | null {
	const oauth = (supabase.auth as { oauth?: SdkOauth }).oauth;
	return oauth ?? null;
}

async function accessToken(supabase: AppSupabase): Promise<string | null> {
	const { data } = await supabase.auth.getSession();
	return data.session?.access_token ?? null;
}

async function authFetch(
	path: string,
	token: string,
	init?: RequestInit
): Promise<{ data: unknown; error: { message: string } | null }> {
	const response = await fetch(`${PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/auth/v1${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			apikey: PUBLIC_SUPABASE_PUBLISHABLE_KEY,
			'Content-Type': 'application/json',
			...(init?.headers ?? {})
		}
	});

	const body = await response.json().catch(() => null);
	if (!response.ok) {
		const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
		const message =
			(typeof record.error_description === 'string' && record.error_description) ||
			(typeof record.msg === 'string' && record.msg) ||
			(typeof record.error === 'string' && record.error) ||
			response.statusText;
		return { data: null, error: { message } };
	}

	return { data: body, error: null };
}

export async function getAuthorizationDetails(
	supabase: AppSupabase,
	authorizationId: string
): Promise<{ data: OAuthAuthorizationResult | null; error: { message: string } | null }> {
	const oauth = sdkOauth(supabase);
	if (oauth) {
		return oauth.getAuthorizationDetails(authorizationId);
	}

	const token = await accessToken(supabase);
	if (!token) {
		return { data: null, error: { message: 'Not signed in' } };
	}

	return authFetch(
		`/oauth/authorizations/${encodeURIComponent(authorizationId)}`,
		token
	) as Promise<{
		data: OAuthAuthorizationResult | null;
		error: { message: string } | null;
	}>;
}

export async function decideAuthorization(
	supabase: AppSupabase,
	authorizationId: string,
	action: 'approve' | 'deny'
): Promise<{ data: OAuthAuthorizationRedirect | null; error: { message: string } | null }> {
	const oauth = sdkOauth(supabase);
	if (oauth) {
		return action === 'approve'
			? oauth.approveAuthorization(authorizationId)
			: oauth.denyAuthorization(authorizationId);
	}

	const token = await accessToken(supabase);
	if (!token) {
		return { data: null, error: { message: 'Not signed in' } };
	}

	return authFetch(`/oauth/authorizations/${encodeURIComponent(authorizationId)}/consent`, token, {
		method: 'POST',
		body: JSON.stringify({ action })
	}) as Promise<{ data: OAuthAuthorizationRedirect | null; error: { message: string } | null }>;
}

export function isAuthorizationDetails(
	value: OAuthAuthorizationResult
): value is OAuthAuthorizationDetails {
	return 'authorization_id' in value;
}
