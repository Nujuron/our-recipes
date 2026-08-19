import { env } from '$env/dynamic/public';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

export function supabaseAuthIssuer(): string {
	return `${PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/auth/v1`;
}

export function publicSiteOrigin(request: Request): string {
	const configured = env.PUBLIC_SITE_URL?.replace(/\/$/, '');
	if (configured) return configured;

	const forwardedHost = request.headers.get('x-forwarded-host');
	const forwardedProto = request.headers.get('x-forwarded-proto');
	if (forwardedHost) {
		const proto = forwardedProto?.split(',')[0]?.trim() || 'https';
		return `${proto}://${forwardedHost.split(',')[0]?.trim()}`;
	}

	return new URL(request.url).origin;
}

export function createUserSupabase(accessToken: string): SupabaseClient<Database> {
	return createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		accessToken: async () => accessToken,
		auth: {
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false
		}
	});
}
