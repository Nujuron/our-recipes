import { randomUUID } from 'node:crypto';
import type { McpServer, ToolAnnotations } from '@modelcontextprotocol/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '$lib/database.types';
import {
	PANTRY_LOCATIONS,
	PANTRY_DATE_STATES,
	isCalendarDate,
	pantryDateState,
	pantryToday,
	parseLotInput,
	validTimezone
} from '$lib/pantry';
import { ALLERGENS } from '$lib/allergens';
import { COURSES, EFFORTS } from '$lib/classifications';
import { listMyFamilies } from '$lib/families';
import { actor, jsonResult, type McpActor } from './mcpTools';
import { createUserSupabase } from './userSupabase';
import { createPantry, loadPantrySuggestions } from './pantry';
import {
	closePantryLot,
	getPantryLot,
	operationLotId,
	PantryToolError,
	pantryWriteError,
	recordPantryPurchase,
	updatePantryLot
} from './pantryMutations';

type AppSupabase = SupabaseClient<Database>;
const read: ToolAnnotations = { readOnlyHint: true, openWorldHint: false };
const write: ToolAnnotations = {
	readOnlyHint: false,
	destructiveHint: false,
	openWorldHint: false
};
const replayable: ToolAnnotations = { ...write, idempotentHint: true };
const versionSchema = z
	.number()
	.int()
	.positive()
	.describe(
		'Current version returned by list_pantries or get_pantry_lot/list_pantry_lots. Reload after a conflict; do not guess the next version.'
	);
const operationSchema = z
	.string()
	.uuid()
	.describe(
		'Unique operation UUID for this purchase/addition. Use suggested_operation_id from list_pantries. Reuse this exact ID and unchanged contents after timeouts; use a fresh ID only for a genuinely new purchase.'
	);
const foodDateSchema = z
	.string()
	.refine(isCalendarDate, 'Expected a real YYYY-MM-DD calendar date');
const lotFields = {
	name: z.string().trim().min(1).max(160),
	quantity: z
		.number()
		.positive()
		.max(1e12)
		.nullable()
		.optional()
		.describe(
			'Amount in the given unit; null if not readable/known. Never use the price as quantity.'
		),
	unit: z.string().trim().max(40).nullable().optional(),
	location: z.enum(PANTRY_LOCATIONS),
	food_date: foodDateSchema
		.nullable()
		.optional()
		.describe('Actual food use-by or best-before date. Never infer from a receipt/purchase date.'),
	date_type: z.enum(['use_by', 'best_before']).nullable().optional(),
	note: z.string().trim().max(1000).nullable().optional()
};
const lotSchema = z.strictObject(lotFields);
export const purchaseItemSchema = z.strictObject({
	line_id: z
		.string()
		.trim()
		.min(1)
		.max(80)
		.describe(
			'Stable line number/key from the receipt. Keep this key unchanged on retries; separate identical products can have separate keys.'
		),
	name: lotFields.name,
	quantity: lotFields.quantity,
	unit: lotFields.unit,
	location: lotFields.location
		.optional()
		.describe(
			'Use only a location chosen by the user. If omitted, pantry is a temporary default editable on the website.'
		),
	note: lotFields.note
});
export const purchaseSchema = z
	.strictObject({
		pantry_id: z.string().uuid(),
		operation_id: operationSchema,
		items: z.array(purchaseItemSchema).min(1).max(100)
	})
	.refine(
		(input) => new Set(input.items.map((item) => item.line_id)).size === input.items.length,
		'Receipt line IDs must be unique'
	);

const messages = {
	not_found: 'Pantry or lot not found, or you no longer have access.',
	conflict:
		'The lot has changed, or this operation was already saved with different contents. Reload the lot or inspect the existing purchase. Do not create a new operation ID just to bypass this conflict.',
	invalid:
		'Invalid lot, quantity, date pair or purchase. Unknown quantities cannot be consumed partially.',
	save_failed:
		'Could not confirm the operation. For purchase/addition retries, reuse the exact operation ID and contents.'
};

export function pantryWebUrl(origin: string, pantryId: string, undated = false) {
	return `${origin.replace(/\/$/, '')}/pantry?pantry=${encodeURIComponent(pantryId)}${undated ? '&date=undated' : ''}`;
}

export function registerPantryTools(server: McpServer) {
	function register<S extends z.ZodObject>(
		name: string,
		description: string,
		schema: S,
		annotations: ToolAnnotations,
		action: (input: z.output<S>, db: AppSupabase, user: McpActor) => Promise<unknown>
	) {
		const inputSchema: z.ZodObject = schema;
		server.registerTool(
			name,
			{ title: name.replaceAll('_', ' '), description, inputSchema, annotations },
			async (input, ctx) => {
				const user = actor(ctx);
				if (!user)
					return { ...jsonResult({ error: 'auth', message: 'Not authenticated.' }), isError: true };
				try {
					return jsonResult(
						await action(input as z.output<S>, createUserSupabase(user.token), user)
					);
				} catch (error) {
					const code = error instanceof PantryToolError ? error.code : 'save_failed';
					return { ...jsonResult({ error: code, message: messages[code] }), isError: true };
				}
			}
		);
	}

	register(
		'list_pantries',
		'List personal and shared pantries accessible to the signed-in user, available families and a suggested operation UUID. Prefer the personal pantry unless the user explicitly chooses a family. Never create or share a family pantry automatically.',
		z.strictObject({}),
		read,
		async (_, db, user) => {
			const [result, families] = await Promise.all([
				db.from('pantries').select('*').order('created_at'),
				listMyFamilies(db, user.userId)
			]);
			if (result.error) throw new PantryToolError('save_failed');
			return {
				pantries: result.data,
				families,
				personal_pantry_id: result.data.find((p) => p.owner_user_id === user.userId)?.id ?? null,
				suggested_operation_id: randomUUID()
			};
		}
	);

	register(
		'create_pantry',
		'Create or return the existing personal pantry, or a family pantry only when explicitly requested. There is one personal pantry per user and one per family. Does not change an existing pantry. Timezone is an IANA name; UTC is available if the user has not specified one.',
		z.strictObject({
			name: z.string().trim().min(1).max(80),
			timezone: z.string().max(100).refine(validTimezone),
			family_id: z.string().uuid().nullable().optional()
		}),
		replayable,
		async (input, db, user) => {
			const result = await createPantry(
				db,
				user.userId,
				input.name,
				input.timezone,
				input.family_id ?? null
			);
			if ('error' in result)
				throw new PantryToolError(result.error === 'invalid' ? 'invalid' : 'save_failed');
			return { ...result, url: pantryWebUrl(user.origin, result.id) };
		}
	);

	register(
		'list_pantry_lots',
		'List inventory with current versions, quantities, dates and date states. Use date_status=undated to find food needing dates. Past dates are informational, not a food safety assessment. Results are paginated.',
		z.strictObject({
			pantry_id: z.string().uuid(),
			status: z.enum(['active', 'finished', 'discarded', 'all']).default('active'),
			location: z.enum(PANTRY_LOCATIONS).optional(),
			date_status: z.enum(PANTRY_DATE_STATES).optional(),
			q: z.string().max(160).optional(),
			offset: z.number().int().min(0).default(0),
			limit: z.number().int().min(1).max(100).default(50)
		}),
		read,
		async (input, db, user) => {
			const { data: pantry, error } = await db
				.from('pantries')
				.select('*')
				.eq('id', input.pantry_id)
				.maybeSingle();
			if (error) throw new PantryToolError('save_failed');
			if (!pantry) throw new PantryToolError('not_found');
			const today = pantryToday(pantry.timezone);
			const cutoff = new Date(Date.parse(`${today}T00:00:00Z`) + pantry.warning_days * 86_400_000)
				.toISOString()
				.slice(0, 10);
			let query = db
				.from('pantry_lots')
				.select('*')
				.eq('pantry_id', pantry.id)
				.order('food_date', { nullsFirst: false })
				.order('id');
			if (input.status !== 'all') query = query.eq('status', input.status);
			if (input.location) query = query.eq('location', input.location);
			if (input.q) query = query.ilike('name', `%${input.q}%`);
			if (input.date_status === 'undated') query = query.is('food_date', null);
			if (input.date_status === 'past') query = query.lt('food_date', today);
			if (input.date_status === 'today') query = query.eq('food_date', today);
			if (input.date_status === 'soon')
				query = query.gt('food_date', today).lte('food_date', cutoff);
			if (input.date_status === 'later') query = query.gt('food_date', cutoff);
			const { data, error: listError } = await query.range(
				input.offset,
				input.offset + input.limit
			);
			if (listError) throw new PantryToolError('save_failed');
			return {
				pantry,
				today,
				lots: data.slice(0, input.limit).map((lot) => ({
					...lot,
					date_state: pantryDateState(lot.food_date, today, pantry.warning_days)
				})),
				next_offset: data.length > input.limit ? input.offset + input.limit : null,
				url: pantryWebUrl(user.origin, pantry.id, input.date_status === 'undated')
			};
		}
	);

	register(
		'get_pantry_lot',
		'Get one accessible lot, including the current version required to edit or consume it.',
		z.strictObject({ id: z.string().uuid() }),
		read,
		(input, db) => getPantryLot(db, input.id)
	);

	register(
		'update_pantry_settings',
		'Update the chosen pantry name, IANA timezone or warning days using its current version from list_pantries. Cannot change ownership or family.',
		z.strictObject({
			id: z.string().uuid(),
			version: versionSchema,
			patch: z
				.strictObject({
					name: z.string().trim().min(1).max(80).optional(),
					timezone: z.string().max(100).refine(validTimezone).optional(),
					warning_days: z.number().int().min(0).max(30).optional()
				})
				.refine((patch) => Object.keys(patch).length > 0, 'Provide at least one change')
		}),
		write,
		async (input, db) => {
			const { data, error } = await db
				.from('pantries')
				.update(input.patch)
				.eq('id', input.id)
				.eq('version', input.version)
				.select('*')
				.maybeSingle();
			if (error) pantryWriteError(error);
			if (!data) throw new PantryToolError('conflict');
			return data;
		}
	);

	register(
		'add_pantry_lot',
		'Add a new food batch without merging existing stock. Operation ID makes retries safe. Dates are optional, but an actual food date needs its matching date_type. A receipt purchase should use record_pantry_purchase instead.',
		z.strictObject({ pantry_id: z.string().uuid(), operation_id: operationSchema, lot: lotSchema }),
		replayable,
		async (input, db, user) => {
			const lot = parseLotInput(input.lot);
			if (!lot) throw new PantryToolError('invalid');
			const id = operationLotId(input.operation_id, 'mcp-lot');
			const { data, error } = await db.rpc('import_pantry_line', {
				p_operation_id: input.operation_id,
				p_line_id: 'mcp-lot',
				p_pantry_id: input.pantry_id,
				p_lots: [{ ...lot, id }]
			});
			if (error) pantryWriteError(error);
			return {
				operation_id: input.operation_id,
				lot_ids: data,
				url: pantryWebUrl(user.origin, input.pantry_id)
			};
		}
	);

	register(
		'record_pantry_purchase',
		'Save purchased FOOD read by the LLM from a user-provided receipt/photo or purchase list. The server receives structured items, not images, and performs no OCR. Include only clearly identified purchased food; exclude prices, discounts, payment lines and non-food. Leave unreadable quantities null and report uncertain/omitted lines to the user. Food dates are ALWAYS left empty for the user to fill later: never use the purchase date or invent expiry dates. All items commit atomically or none do. After a timeout retry the exact operation_id, line_ids, item order and contents. A new operation ID represents a new purchase; there is no automatic recognition of the same photograph. Returns an undated-food URL for completing dates.',
		purchaseSchema,
		replayable,
		async (input, db, user) => ({
			...(await recordPantryPurchase(db, input.pantry_id, input.operation_id, input.items)),
			complete_dates_url: pantryWebUrl(user.origin, input.pantry_id, true)
		})
	);

	register(
		'update_pantry_lot',
		'Edit an active lot using its current version. Only change fields explicitly requested. Unknown quantities may be filled in; no unit conversion is performed. Date and type must form a pair. Clear food_date with null to remove its type too. On conflict reload; never overwrite blindly.',
		z.strictObject({
			id: z.string().uuid(),
			version: versionSchema,
			patch: lotSchema
				.partial()
				.refine((patch) => Object.keys(patch).length > 0, 'Provide at least one change')
		}),
		write,
		(input, db) => updatePantryLot(db, input.id, input.version, input.patch)
	);

	register(
		'consume_pantry_lot',
		'Record an explicitly requested positive amount consumed, in the lot’s existing unit. Requires a known quantity and current version, refuses negative stock, and finishes the lot at zero. Never deduct automatically when merely suggesting or saving a recipe.',
		z.strictObject({
			id: z.string().uuid(),
			version: versionSchema,
			amount: z.number().positive().max(1e12)
		}),
		write,
		async (input, db) => {
			const { data, error } = await db.rpc('consume_pantry_lot', {
				p_lot_id: input.id,
				p_version: input.version,
				p_amount: input.amount
			});
			if (error) pantryWriteError(error);
			return data;
		}
	);

	register(
		'close_pantry_lot',
		'Mark an explicitly chosen lot finished or discarded. Keeps its history. Finished sets remaining quantity to zero. Requires the current version.',
		z.strictObject({
			id: z.string().uuid(),
			version: versionSchema,
			status: z.enum(['finished', 'discarded'])
		}),
		{ ...write, destructiveHint: true },
		(input, db) => closePantryLot(db, input.id, input.version, input.status)
	);

	register(
		'recommend_pantry_recipes',
		'Find recipes the user may access (own, public and family-shared), ranked by distinct ingredients due today/soon and then other inventory matches. Past-date stock is excluded; matches do not guarantee sufficient quantities or food safety. Optional exact ingredient search and existing allergen, course and effort filters.',
		z.strictObject({
			pantry_id: z.string().uuid(),
			ingredient: z.string().trim().min(1).max(160).optional(),
			course: z.enum(COURSES).optional(),
			effort: z.enum(EFFORTS).optional(),
			exclude_allergens: z.array(z.enum(ALLERGENS)).max(14).default([]),
			limit: z.number().int().min(1).max(20).default(10),
			offset: z.number().int().min(0).default(0)
		}),
		read,
		async (input, db, user) => {
			const result = await loadPantrySuggestions(db, input.pantry_id, input.ingredient ?? '', {
				course: input.course ?? null,
				effort: input.effort ?? null,
				excludeAllergens: input.exclude_allergens
			});
			if (!result) throw new PantryToolError('not_found');
			return {
				pantry: result.pantry,
				today: result.today,
				items: result.items
					.slice(input.offset, input.offset + input.limit)
					.map((item) => ({ ...item, recipe_url: `${user.origin}/r/${item.recipe.id}` })),
				next_offset:
					result.items.length > input.offset + input.limit ? input.offset + input.limit : null,
				quantity_sufficiency_verified: false
			};
		}
	);
}
