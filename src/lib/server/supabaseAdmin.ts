import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

let client: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
	if (client) return client;

	const secretKey = env.SUPABASE_SECRET_KEY;
	if (!secretKey) {
		throw new Error('SUPABASE_SECRET_KEY is not configured');
	}

	client = createClient<Database>(PUBLIC_SUPABASE_URL, secretKey, {
		auth: {
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false
		}
	});

	return client;
}
