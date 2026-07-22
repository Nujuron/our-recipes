import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();

vi.mock('$lib/server/supabaseAdmin', () => ({
	getSupabaseAdmin: () => ({ rpc })
}));

import { POST } from '../../routes/r/[id]/view/+server';

const recipeId = '20000000-0000-0000-0000-000000000001';

type AuthResult = {
	data: { user: { id: string } | null };
	error: unknown;
};

function event(
	origin = 'https://recipes.example',
	authResult: AuthResult = { data: { user: null }, error: null }
) {
	const url = new URL(`https://recipes.example/r/${recipeId}/view`);
	return {
		request: new Request(url, { method: 'POST', headers: { origin } }),
		url,
		params: { id: recipeId },
		cookies: { get: vi.fn<() => string | undefined>(() => 'opaque-token') },
		locals: {
			supabase: {
				auth: {
					getUser: vi.fn().mockResolvedValue(authResult)
				}
			}
		}
	};
}

describe('POST /r/[id]/view', () => {
	beforeEach(() => {
		rpc.mockReset();
	});

	it('returns the authoritative total for a same-origin request', async () => {
		rpc.mockResolvedValue({
			data: [{ counted: true, view_count: 8 }],
			error: null
		});

		const response = await POST(event() as never);

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		await expect(response.json()).resolves.toEqual({ counted: true, viewCount: 8 });
	});

	it('rejects cross-origin requests before database access', async () => {
		const response = await POST(event('https://attacker.example') as never);

		expect(response.status).toBe(403);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(rpc).not.toHaveBeenCalled();
	});

	it('rejects malformed recipe IDs before database access', async () => {
		const requestEvent = event();
		requestEvent.params.id = 'not-a-uuid';

		const response = await POST(requestEvent as never);

		expect(response.status).toBe(404);
		expect(rpc).not.toHaveBeenCalled();
	});

	it('rejects requests without a viewer cookie', async () => {
		const requestEvent = event();
		requestEvent.cookies.get.mockReturnValue(undefined);

		const response = await POST(requestEvent as never);

		expect(response.status).toBe(404);
		expect(rpc).not.toHaveBeenCalled();
	});

	it('forwards the verified user ID for owner exclusion', async () => {
		rpc.mockResolvedValue({
			data: [{ counted: false, view_count: 8 }],
			error: null
		});

		const response = await POST(
			event('https://recipes.example', {
				data: { user: { id: '10000000-0000-0000-0000-000000000001' } },
				error: null
			}) as never
		);

		expect(response.status).toBe(200);
		expect(rpc).toHaveBeenCalledWith(
			'record_recipe_view',
			expect.objectContaining({
				p_user_id: '10000000-0000-0000-0000-000000000001'
			})
		);
		await expect(response.json()).resolves.toEqual({ counted: false, viewCount: 8 });
	});

	it('fails closed when authentication cannot be verified', async () => {
		const response = await POST(
			event('https://recipes.example', {
				data: { user: null },
				error: { message: 'auth unavailable' }
			}) as never
		);

		expect(response.status).toBe(503);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(rpc).not.toHaveBeenCalled();
		await expect(response.json()).resolves.toEqual({ error: 'unavailable' });
	});

	it('normalizes rejected authentication checks to unavailable', async () => {
		const requestEvent = event();
		requestEvent.locals.supabase.auth.getUser.mockRejectedValue(new Error('auth unavailable'));

		const response = await POST(requestEvent as never);

		expect(response.status).toBe(503);
		expect(rpc).not.toHaveBeenCalled();
		await expect(response.json()).resolves.toEqual({ error: 'unavailable' });
	});

	it('uses one response for hidden and missing recipes', async () => {
		rpc.mockResolvedValue({ data: [], error: null });

		const response = await POST(event() as never);

		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual({ error: 'not_found' });
	});

	it('keeps database failures generic', async () => {
		rpc.mockResolvedValue({
			data: null,
			error: { message: 'sensitive database detail' }
		});

		const response = await POST(event() as never);

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toEqual({ error: 'unavailable' });
	});
});
