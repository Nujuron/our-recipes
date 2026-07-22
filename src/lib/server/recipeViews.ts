import { createHash, randomUUID } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import type { Database } from '$lib/database.types';

export const RECIPE_VIEWER_COOKIE = 'recipe_viewer';
export const RECIPE_VIEWER_MAX_AGE = 60 * 60 * 24 * 365;

type RecipeViewerCookies = Pick<Cookies, 'get' | 'set'>;
type RecordRecipeViewFunction = Database['public']['Functions']['record_recipe_view'];

type RecipeViewRpcClient = {
	rpc(
		name: 'record_recipe_view',
		args: RecordRecipeViewFunction['Args']
	): PromiseLike<{
		data: RecordRecipeViewFunction['Returns'] | null;
		error: unknown;
	}>;
};

export type RecordRecipeViewResult =
	{ kind: 'ok'; counted: boolean; viewCount: number } | { kind: 'not_found' } | { kind: 'error' };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ensureRecipeViewerCookie(cookies: RecipeViewerCookies, secure: boolean): void {
	const existing = cookies.get(RECIPE_VIEWER_COOKIE);
	if (existing) return;

	const token = randomUUID();
	cookies.set(RECIPE_VIEWER_COOKIE, token, {
		httpOnly: true,
		maxAge: RECIPE_VIEWER_MAX_AGE,
		path: '/',
		sameSite: 'lax',
		secure
	});
}

export function getRecipeViewerCookie(cookies: Pick<RecipeViewerCookies, 'get'>): string | null {
	return cookies.get(RECIPE_VIEWER_COOKIE) ?? null;
}

export function hashRecipeViewer(token: string, recipeId: string): string {
	return createHash('sha256').update(`${recipeId}:${token}`).digest('hex');
}

export function isUuid(value: string): boolean {
	return UUID_PATTERN.test(value);
}

export function isSameOrigin(request: Request, url: URL): boolean {
	return request.headers.get('origin') === url.origin;
}

export async function recordRecipeView(
	supabase: RecipeViewRpcClient,
	recipeId: string,
	token: string,
	userId: string | null
): Promise<RecordRecipeViewResult> {
	const { data, error } = await supabase.rpc('record_recipe_view', {
		p_recipe_id: recipeId,
		p_user_id: userId,
		p_viewer_hash: hashRecipeViewer(token, recipeId)
	});

	if (error) return { kind: 'error' };

	const result = data?.[0];
	if (!result) return { kind: 'not_found' };

	return {
		kind: 'ok',
		counted: result.counted,
		viewCount: result.view_count
	};
}
