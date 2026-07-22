import { describe, expect, it, vi } from 'vitest';
import {
	RECIPE_VIEWER_COOKIE,
	ensureRecipeViewerCookie,
	hashRecipeViewer,
	isSameOrigin,
	isUuid,
	recordRecipeView
} from './recipeViews';

function cookieStore(existing?: string) {
	const set = vi.fn();
	return {
		get: vi.fn(() => existing),
		set
	};
}

describe('ensureRecipeViewerCookie', () => {
	it('reuses an existing opaque token', () => {
		const cookies = cookieStore('existing-token');

		ensureRecipeViewerCookie(cookies, true);
		expect(cookies.set).not.toHaveBeenCalled();
	});

	it('creates a secure HTTP-only cookie when missing', () => {
		const cookies = cookieStore();

		ensureRecipeViewerCookie(cookies, true);
		const token = cookies.set.mock.calls[0]?.[1];

		expect(token).toMatch(/^[0-9a-f-]{36}$/);
		expect(cookies.set).toHaveBeenCalledWith(RECIPE_VIEWER_COOKIE, token, {
			httpOnly: true,
			maxAge: 60 * 60 * 24 * 365,
			path: '/',
			sameSite: 'lax',
			secure: true
		});
	});
});

describe('hashRecipeViewer', () => {
	it('is deterministic and scoped to one recipe', () => {
		const token = 'opaque-token';
		const firstRecipe = '20000000-0000-0000-0000-000000000001';
		const secondRecipe = '20000000-0000-0000-0000-000000000002';

		const firstHash = hashRecipeViewer(token, firstRecipe);

		expect(firstHash).toMatch(/^[0-9a-f]{64}$/);
		expect(hashRecipeViewer(token, firstRecipe)).toBe(firstHash);
		expect(hashRecipeViewer(token, secondRecipe)).not.toBe(firstHash);
	});
});

describe('request validation', () => {
	it('accepts only canonical UUIDs', () => {
		expect(isUuid('20000000-0000-0000-0000-000000000001')).toBe(true);
		expect(isUuid('not-a-uuid')).toBe(false);
		expect(isUuid('20000000-0000-0000-0000-000000000001-extra')).toBe(false);
	});

	it('requires the request origin to match', () => {
		const url = new URL('https://recipes.example/r/id/view');

		expect(
			isSameOrigin(new Request(url, { method: 'POST', headers: { origin: url.origin } }), url)
		).toBe(true);
		expect(
			isSameOrigin(
				new Request(url, { method: 'POST', headers: { origin: 'https://attacker.example' } }),
				url
			)
		).toBe(false);
		expect(isSameOrigin(new Request(url, { method: 'POST' }), url)).toBe(false);
	});
});

describe('recordRecipeView', () => {
	it('maps the database result to the endpoint contract', async () => {
		const rpc = vi.fn().mockResolvedValue({
			data: [{ counted: true, view_count: 12 }],
			error: null
		});

		await expect(
			recordRecipeView({ rpc }, '20000000-0000-0000-0000-000000000001', 'opaque-token', null)
		).resolves.toEqual({ kind: 'ok', counted: true, viewCount: 12 });
		expect(rpc).toHaveBeenCalledWith('record_recipe_view', {
			p_recipe_id: '20000000-0000-0000-0000-000000000001',
			p_user_id: null,
			p_viewer_hash: expect.stringMatching(/^[0-9a-f]{64}$/)
		});
	});

	it('distinguishes hidden recipes from database failures', async () => {
		const hiddenRpc = vi.fn().mockResolvedValue({ data: [], error: null });
		const failedRpc = vi.fn().mockResolvedValue({
			data: null,
			error: { message: 'internal database detail' }
		});

		await expect(
			recordRecipeView(
				{ rpc: hiddenRpc },
				'20000000-0000-0000-0000-000000000001',
				'opaque-token',
				null
			)
		).resolves.toEqual({ kind: 'not_found' });
		await expect(
			recordRecipeView(
				{ rpc: failedRpc },
				'20000000-0000-0000-0000-000000000001',
				'opaque-token',
				null
			)
		).resolves.toEqual({ kind: 'error' });
	});
});
