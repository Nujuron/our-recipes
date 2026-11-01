import { fail, redirect } from '@sveltejs/kit';
import { createPantry, loadPantryOverview } from '$lib/server/pantry';
import { isRecipeId } from '$lib/recipeMutations';
import { parseLotInput, validTimezone } from '$lib/pantry';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();
	if (!user) redirect(303, '/login?redirectTo=/pantry');
	return {
		inventory: loadPantryOverview(locals.supabase, user.id, url.searchParams.get('pantry'))
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { error: 'auth' });
		const form = await request.formData();
		const familyId = String(form.get('family_id') ?? '') || null;
		if (familyId && !isRecipeId(familyId)) return fail(400, { error: 'invalid' });
		const result = await createPantry(
			locals.supabase,
			user.id,
			String(form.get('name') ?? ''),
			String(form.get('timezone') ?? ''),
			familyId
		);
		if ('error' in result) return fail(400, { error: result.error });
		redirect(303, `/pantry?pantry=${result.id}`);
	},
	save: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { error: 'auth' });
		const form = await request.formData();
		const values = Object.fromEntries(form);
		// An empty date always clears its type, including when JavaScript is unavailable.
		if (!values.food_date) values.date_type = '';
		const lot = parseLotInput(values);
		const pantryId = String(form.get('pantry_id') ?? '');
		const id = String(form.get('id') ?? '');
		const version = Number(form.get('version'));
		if (
			!lot ||
			!isRecipeId(pantryId) ||
			(id && (!isRecipeId(id) || !Number.isSafeInteger(version) || version < 1))
		)
			return fail(400, { error: 'invalid' });
		if (!id) {
			const { error } = await locals.supabase
				.from('pantry_lots')
				.insert({ ...lot, pantry_id: pantryId });
			if (error) return fail(500, { error: 'generic' });
		} else {
			const { data, error } = await locals.supabase
				.from('pantry_lots')
				.update(lot)
				.eq('id', id)
				.eq('pantry_id', pantryId)
				.eq('status', 'active')
				.eq('version', version)
				.select('id');
			if (error) return fail(500, { error: 'generic' });
			if (!data?.length) return fail(409, { error: 'conflict' });
		}
		return { saved: true };
	},
	consume: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { error: 'auth' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const version = Number(form.get('version'));
		const amount = Number(String(form.get('amount') ?? '').replace(',', '.'));
		if (
			!isRecipeId(id) ||
			!Number.isSafeInteger(version) ||
			version < 1 ||
			!Number.isFinite(amount) ||
			amount <= 0
		)
			return fail(400, { error: 'invalid' });
		const { error } = await locals.supabase.rpc('consume_pantry_lot', {
			p_lot_id: id,
			p_version: version,
			p_amount: amount
		});
		if (error)
			return fail(error.message.includes('pantry_conflict') ? 409 : 400, {
				error: error.message.includes('pantry_conflict') ? 'conflict' : 'invalid'
			});
		return { saved: true };
	},
	close: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { error: 'auth' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const version = Number(form.get('version'));
		const status = form.get('status');
		if (
			!isRecipeId(id) ||
			!Number.isSafeInteger(version) ||
			version < 1 ||
			(status !== 'finished' && status !== 'discarded')
		)
			return fail(400, { error: 'invalid' });
		const patch =
			status === 'finished' ? ({ status, quantity: 0 } as const) : ({ status } as const);
		const { data, error } = await locals.supabase
			.from('pantry_lots')
			.update(patch)
			.eq('id', id)
			.eq('version', version)
			.eq('status', 'active')
			.select('id');
		if (error) return fail(500, { error: 'generic' });
		if (!data?.length) return fail(409, { error: 'conflict' });
		return { saved: true };
	},
	settings: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { error: 'auth' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const version = Number(form.get('version'));
		const name = String(form.get('name') ?? '').trim();
		const timezone = String(form.get('timezone') ?? '');
		const days = Number(form.get('warning_days'));
		if (
			!isRecipeId(id) ||
			!Number.isSafeInteger(version) ||
			version < 1 ||
			!name ||
			name.length > 80 ||
			!validTimezone(timezone) ||
			!Number.isInteger(days) ||
			days < 0 ||
			days > 30
		)
			return fail(400, { error: 'invalid' });
		const { data, error } = await locals.supabase
			.from('pantries')
			.update({ name, timezone, warning_days: days })
			.eq('id', id)
			.eq('version', version)
			.select('id');
		if (error) return fail(500, { error: 'generic' });
		if (!data?.length) return fail(409, { error: 'conflict' });
		return { saved: true };
	}
};
