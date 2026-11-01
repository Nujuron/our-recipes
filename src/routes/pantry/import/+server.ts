import { json } from '@sveltejs/kit';
import { isRecipeId } from '$lib/recipeMutations';
import { parseLotInput } from '$lib/pantry';
import type { Json } from '$lib/database.types';
import type { RequestHandler } from './$types';

const response = (body: unknown, status = 200) =>
	json(body, { status, headers: { 'cache-control': 'private, no-store' } });

export const GET: RequestHandler = async ({ locals }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();
	if (!user) return response({ error: 'auth' }, 401);
	const { data, error } = await locals.supabase
		.from('pantries')
		.select('id, name')
		.order('created_at');
	return error
		? response({ error: 'generic' }, 500)
		: response({ userId: user.id, pantries: data });
};

export const POST: RequestHandler = async ({ locals, request, url }) => {
	// SvelteKit's form origin protection doesn't cover application/json endpoints.
	if (request.headers.get('origin') !== url.origin) return response({ error: 'forbidden' }, 403);
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();
	if (!user) return response({ error: 'auth' }, 401);
	let body;
	try {
		const text = await request.text();
		if (text.length > 250_000) return response({ error: 'invalid' }, 413);
		body = JSON.parse(text);
	} catch {
		return response({ error: 'invalid' }, 400);
	}
	if (
		!body ||
		body.userId !== user.id ||
		!isRecipeId(body.operationId) ||
		!isRecipeId(body.pantryId) ||
		!Array.isArray(body.lines) ||
		body.lines.length < 1 ||
		body.lines.length > 100
	)
		return response({ error: 'invalid' }, 400);
	const lines: { id: string; lots: Json }[] = [];
	const lineIds = new Set<string>();
	const lotIds = new Set<string>();
	for (const line of body.lines) {
		if (
			!line ||
			typeof line.lineId !== 'string' ||
			!line.lineId ||
			line.lineId.length > 100 ||
			lineIds.has(line.lineId) ||
			!Array.isArray(line.lots) ||
			line.lots.length < 1 ||
			line.lots.length > 20
		)
			return response({ error: 'invalid' }, 400);
		lineIds.add(line.lineId);
		const lots = [];
		for (const raw of line.lots) {
			if (!raw || !isRecipeId(raw.id) || lotIds.has(raw.id))
				return response({ error: 'invalid' }, 400);
			const lot = parseLotInput(raw);
			if (!lot) return response({ error: 'invalid' }, 400);
			lotIds.add(raw.id);
			lots.push({ ...lot, id: raw.id });
		}
		lines.push({ id: line.lineId, lots });
	}
	const saved: string[] = [];
	const failed: string[] = [];
	for (const line of lines) {
		const { error } = await locals.supabase.rpc('import_pantry_line', {
			p_operation_id: body.operationId,
			p_line_id: line.id,
			p_pantry_id: body.pantryId,
			p_lots: line.lots
		});
		(error ? failed : saved).push(line.id);
	}
	return response({ saved, failed });
};
