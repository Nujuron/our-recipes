import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, PantryLot } from '$lib/database.types';
import { parseLotInput, type LotInput } from '$lib/pantry';

type AppSupabase = SupabaseClient<Database>;
export class PantryToolError extends Error {
	constructor(public code: 'not_found' | 'conflict' | 'invalid' | 'save_failed') {
		super(code);
	}
}

export function pantryWriteError(error: { message: string }): never {
	if (error.message.includes('pantry_conflict')) throw new PantryToolError('conflict');
	if (error.message.includes('pantry_not_found')) throw new PantryToolError('not_found');
	if (error.message.includes('invalid_quantity') || error.message.includes('invalid_import'))
		throw new PantryToolError('invalid');
	throw new PantryToolError('save_failed');
}

/** RFC 9562 UUIDv5: operation UUID is the namespace, so retries derive identical lot IDs. */
export function operationLotId(operationId: string, lineId: string): string {
	const namespace = Buffer.from(operationId.replaceAll('-', ''), 'hex');
	if (namespace.length !== 16) throw new PantryToolError('invalid');
	const bytes = createHash('sha1')
		.update(namespace)
		.update(lineId, 'utf8')
		.digest()
		.subarray(0, 16);
	bytes[6] = (bytes[6] & 0x0f) | 0x50;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = bytes.toString('hex');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function getPantryLot(supabase: AppSupabase, id: string) {
	const { data, error } = await supabase.from('pantry_lots').select('*').eq('id', id).maybeSingle();
	if (error) throw new PantryToolError('save_failed');
	if (!data) throw new PantryToolError('not_found');
	return data;
}

export async function updatePantryLot(
	supabase: AppSupabase,
	id: string,
	version: number,
	patch: Partial<LotInput>
) {
	const current = await getPantryLot(supabase, id);
	if (current.version !== version) throw new PantryToolError('conflict');
	if (current.status !== 'active' || Object.keys(patch).length === 0)
		throw new PantryToolError('invalid');
	const merged = { ...current, ...patch };
	if (patch.food_date === null && patch.date_type === undefined) merged.date_type = null;
	const lot = parseLotInput(merged);
	if (!lot) throw new PantryToolError('invalid');
	const { data, error } = await supabase
		.from('pantry_lots')
		.update(lot)
		.eq('id', id)
		.eq('version', version)
		.eq('status', 'active')
		.select('*')
		.maybeSingle();
	if (error) pantryWriteError(error);
	if (!data) throw new PantryToolError('conflict');
	return data;
}

export async function closePantryLot(
	supabase: AppSupabase,
	id: string,
	version: number,
	status: 'finished' | 'discarded'
) {
	const patch = status === 'finished' ? { status, quantity: 0 } : { status };
	const { data, error } = await supabase
		.from('pantry_lots')
		.update(patch)
		.eq('id', id)
		.eq('version', version)
		.eq('status', 'active')
		.select('*')
		.maybeSingle();
	if (error) pantryWriteError(error);
	if (!data) throw new PantryToolError('conflict');
	return data;
}

export type PurchaseItem = {
	line_id: string;
	name: string;
	quantity?: number | null;
	unit?: string | null;
	location?: PantryLot['location'];
	note?: string | null;
};

export function purchaseLots(operationId: string, items: PurchaseItem[]) {
	if (
		items.length < 1 ||
		items.length > 100 ||
		new Set(items.map((item) => item.line_id)).size !== items.length
	)
		throw new PantryToolError('invalid');
	return items.map((item) => {
		if (!item.line_id.trim() || item.line_id.length > 80) throw new PantryToolError('invalid');
		const lot = parseLotInput({
			...item,
			location: item.location ?? 'pantry',
			food_date: null,
			date_type: null
		});
		if (!lot) throw new PantryToolError('invalid');
		return { ...lot, id: operationLotId(operationId, `purchase:${item.line_id}`) };
	});
}

export async function recordPantryPurchase(
	supabase: AppSupabase,
	pantryId: string,
	operationId: string,
	items: PurchaseItem[]
) {
	const lots = purchaseLots(operationId, items);
	const { data, error } = await supabase.rpc('record_pantry_purchase', {
		p_pantry_id: pantryId,
		p_operation_id: operationId,
		p_items: lots
	});
	if (error) pantryWriteError(error);
	if (!data || data.length !== lots.length) throw new PantryToolError('save_failed');
	const pending = await supabase
		.from('pantry_lots')
		.select('id')
		.in('id', data)
		.eq('status', 'active')
		.is('food_date', null);
	if (pending.error) throw new PantryToolError('save_failed');
	return {
		operation_id: operationId,
		pantry_id: pantryId,
		lot_ids: data,
		dates_pending: pending.data.length
	};
}
