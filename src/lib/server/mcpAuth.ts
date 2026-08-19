import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import type { AuthInfo } from '@modelcontextprotocol/server';
import type { Database } from '$lib/database.types';
import { publicSiteOrigin } from './userSupabase';

function jwtClaims(token: string): { exp?: number; client_id?: string } {
	const parts = token.split('.');
	if (parts.length < 2) return {};
	try {
		const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
		return JSON.parse(json) as { exp?: number; client_id?: string };
	} catch {
		return {};
	}
}

export async function verifyMcpAccessToken(
	request: Request,
	bearerToken?: string
): Promise<AuthInfo | undefined> {
	if (!bearerToken) return undefined;

	const supabase = createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		auth: {
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false
		}
	});

	const {
		data: { user },
		error
	} = await supabase.auth.getUser(bearerToken);

	if (error || !user) return undefined;

	const claims = jwtClaims(bearerToken);
	const expiresAt =
		typeof claims.exp === 'number' ? claims.exp : Math.floor(Date.now() / 1000) + 60 * 60;

	return {
		token: bearerToken,
		clientId: typeof claims.client_id === 'string' ? claims.client_id : user.id,
		scopes: [],
		expiresAt,
		extra: {
			userId: user.id,
			origin: publicSiteOrigin(request)
		}
	};
}
