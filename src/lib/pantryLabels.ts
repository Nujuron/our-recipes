import type { PantryLot } from '$lib/database.types';
import type { PantryDateState } from '$lib/pantry';
import * as m from '$lib/paraglide/messages';

export function pantryLocationLabel(location: PantryLot['location']) {
	return {
		pantry: m.pantry_location_pantry,
		fridge: m.pantry_location_fridge,
		freezer: m.pantry_location_freezer
	}[location]();
}
export function pantryDateStateLabel(state: PantryDateState) {
	return {
		past: m.pantry_date_past,
		today: m.pantry_date_today,
		soon: m.pantry_date_soon,
		later: m.pantry_date_later,
		undated: m.pantry_date_undated
	}[state]();
}
export function pantryDateTypeLabel(type: PantryLot['date_type']) {
	return type === 'use_by'
		? m.pantry_use_by()
		: type === 'best_before'
			? m.pantry_best_before()
			: m.pantry_date_undated();
}
