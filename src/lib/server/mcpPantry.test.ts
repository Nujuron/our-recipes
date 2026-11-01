import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-key'
}));
vi.mock('./mcpAuth', () => ({
	verifyMcpAccessToken: async (_request: Request, token?: string) =>
		token === 'valid-token'
			? {
					token,
					clientId: 'test-client',
					scopes: [],
					expiresAt: 9999999999,
					extra: {
						userId: '10000000-0000-4000-8000-000000000001',
						origin: 'https://recipes.example'
					}
				}
			: undefined
}));

import { mcpRequestHandler } from './mcpServer';
import { operationLotId } from './pantryMutations';

const pantryId = '30000000-0000-4000-8000-000000000001';
const lotId = '40000000-0000-4000-8000-000000000001';
const operationId = '50000000-0000-4000-8000-000000000001';
const lot = {
	id: lotId,
	pantry_id: pantryId,
	name: 'Arroz',
	quantity: 2,
	unit: 'kg',
	location: 'pantry',
	food_date: null,
	date_type: null,
	note: null,
	status: 'active',
	version: 3,
	created_at: '',
	updated_at: ''
};
const calls: { url: URL; headers: Headers; body: Record<string, unknown> | undefined }[] = [];
let queryResult: unknown;
let rpcError = false;
let pendingIds: string[] = [];

function request(
	method: string,
	params: Record<string, unknown> = {},
	token: string | null = 'valid-token'
) {
	return new Request('https://recipes.example/mcp', {
		method: 'POST',
		headers: {
			'Mcp-Method': method,
			'Mcp-Protocol-Version': '2026-07-28',
			...(typeof params.name === 'string' ? { 'Mcp-Name': params.name } : {}),
			'content-type': 'application/json',
			accept: 'application/json, text/event-stream',
			...(token ? { authorization: `Bearer ${token}` } : {})
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method,
			params: {
				...params,
				_meta: {
					'io.modelcontextprotocol/protocolVersion': '2026-07-28',
					'io.modelcontextprotocol/clientInfo': { name: 'pantry-test', version: '1.0.0' },
					'io.modelcontextprotocol/clientCapabilities': {}
				}
			}
		})
	});
}

async function invoke(name: string, args: Record<string, unknown>) {
	const response = await mcpRequestHandler(request('tools/call', { name, arguments: args }));
	expect(response.status, await response.clone().text()).toBe(200);
	return response.json();
}

describe('authenticated pantry MCP over HTTP', () => {
	beforeEach(() => {
		calls.length = 0;
		rpcError = false;
		queryResult = lot;
		pendingIds = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = new URL(
					typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
				);
				const headers = new Headers(init?.headers);
				const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
				calls.push({ url, headers, body });
				if (url.pathname === '/rest/v1/rpc/record_pantry_purchase') {
					if (rpcError)
						return new Response(JSON.stringify({ message: 'pantry_conflict', code: 'P0001' }), {
							status: 400,
							headers: { 'content-type': 'application/json' }
						});
					pendingIds = body.p_items.map((item: { id: string }) => item.id);
					return new Response(JSON.stringify(pendingIds), {
						headers: { 'content-type': 'application/json' }
					});
				}
				if (url.pathname === '/rest/v1/pantry_lots' && url.searchParams.get('select') === 'id')
					return new Response(JSON.stringify(pendingIds.map((id) => ({ id }))), {
						headers: { 'content-type': 'application/json' }
					});
				return new Response(JSON.stringify(queryResult), {
					headers: { 'content-type': 'application/json' }
				});
			})
		);
	});
	afterEach(() => vi.unstubAllGlobals());

	it('rejects unauthenticated calls before accessing any data', async () => {
		const response = await mcpRequestHandler(request('tools/list', {}, null));
		expect(response.status).toBe(401);
		expect(calls).toHaveLength(0);
	});
	it('advertises the existing recipe tools and all pantry tools with correct write hints', async () => {
		const response = await mcpRequestHandler(request('tools/list'));
		expect(response.status, await response.clone().text()).toBe(200);
		const body = await response.json();
		const tools = body.result.tools;
		for (const name of [
			'create_recipe',
			'update_recipe',
			'list_my_recipes',
			'get_recipe',
			'list_pantries',
			'create_pantry',
			'list_pantry_lots',
			'get_pantry_lot',
			'add_pantry_lot',
			'record_pantry_purchase',
			'update_pantry_lot',
			'consume_pantry_lot',
			'close_pantry_lot',
			'update_pantry_settings',
			'recommend_pantry_recipes'
		])
			expect(tools.some((t: { name: string }) => t.name === name)).toBe(true);
		const receipt = tools.find((t: { name: string }) => t.name === 'record_pantry_purchase');
		expect(receipt.annotations).toMatchObject({
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true
		});
		expect(receipt.inputSchema.properties.items.items.properties).not.toHaveProperty('food_date');
		expect(calls).toHaveLength(0);
	});

	it('also exposes the new tools to 2025 Streamable HTTP clients', async () => {
		const response = await mcpRequestHandler(
			new Request('https://recipes.example/mcp', {
				method: 'POST',
				headers: {
					authorization: 'Bearer valid-token',
					'content-type': 'application/json',
					accept: 'application/json, text/event-stream',
					'mcp-protocol-version': '2025-11-25'
				},
				body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
			})
		);
		const text = await response.text();
		expect(response.status, text).toBe(200);
		const body = response.headers.get('content-type')?.includes('application/json')
			? JSON.parse(text)
			: text
					.split(/\r?\n/)
					.filter((line) => line.startsWith('data: ') && line.slice(6).trim())
					.map((line) => JSON.parse(line.slice(6)))
					.find((message) => message.result?.tools);
		expect(
			body.result.tools.some((tool: { name: string }) => tool.name === 'record_pantry_purchase')
		).toBe(true);
	});
	it('uses the caller token to retrieve a versioned lot', async () => {
		const result = await invoke('get_pantry_lot', { id: lotId });
		expect(JSON.parse(result.result.content[0].text)).toMatchObject({ id: lotId, version: 3 });
		expect(calls[0].headers.get('authorization')).toBe('Bearer valid-token');
		expect(calls[0].url.searchParams.get('id')).toBe(`eq.${lotId}`);
	});
	it('passes a receipt to the atomic RPC with stable IDs, empty dates and a completion URL', async () => {
		const args = {
			pantry_id: pantryId,
			operation_id: operationId,
			items: [
				{ line_id: '1', name: 'Arroz', quantity: 2, unit: 'kg' },
				{ line_id: '2', name: 'Espinacas', quantity: null }
			]
		};
		const first = await invoke('record_pantry_purchase', args);
		const second = await invoke('record_pantry_purchase', args);
		expect(first).toEqual(second);
		const output = JSON.parse(first.result.content[0].text);
		expect(output.complete_dates_url).toBe(
			`https://recipes.example/pantry?pantry=${pantryId}&date=undated`
		);
		expect(output.lot_ids).toEqual([
			operationLotId(operationId, 'purchase:1'),
			operationLotId(operationId, 'purchase:2')
		]);
		expect(calls[0].body).toMatchObject({
			p_operation_id: operationId,
			p_pantry_id: pantryId,
			p_items: [
				{ food_date: null, date_type: null },
				{ quantity: null, food_date: null, date_type: null }
			]
		});
		expect(calls[0].headers.get('authorization')).toBe('Bearer valid-token');
	});
	it('rejects duplicate receipt line keys without any database writes', async () => {
		const result = await invoke('record_pantry_purchase', {
			pantry_id: pantryId,
			operation_id: operationId,
			items: [
				{ line_id: '1', name: 'Arroz' },
				{ line_id: '1', name: 'Leche' }
			]
		});
		expect(result.result.isError).toBe(true);
		expect(calls).toHaveLength(0);
	});
	it('does not overwrite a stale edit', async () => {
		const result = await invoke('update_pantry_lot', {
			id: lotId,
			version: 2,
			patch: { food_date: '2026-11-10', date_type: 'use_by' }
		});
		expect(result.result.isError).toBe(true);
		expect(JSON.parse(result.result.content[0].text).error).toBe('conflict');
		expect(calls).toHaveLength(1);
	});
	it('returns a replay conflict as an error and never claims the purchase was saved', async () => {
		rpcError = true;
		const result = await invoke('record_pantry_purchase', {
			pantry_id: pantryId,
			operation_id: operationId,
			items: [{ line_id: '1', name: 'Arroz' }]
		});
		expect(result.result.isError).toBe(true);
		expect(JSON.parse(result.result.content[0].text).error).toBe('conflict');
	});
});
