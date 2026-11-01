import type { Pantry, PantryLot } from '$lib/database.types';
import { parseIngredientsJson } from '$lib/ingredients';

export const PANTRY_LOCATIONS = ['pantry', 'fridge', 'freezer'] as const;
export const PANTRY_DATE_STATES = ['past', 'today', 'soon', 'later', 'undated'] as const;
export type PantryDateState = (typeof PANTRY_DATE_STATES)[number];
export type LotInput = Pick<
	PantryLot,
	'name' | 'quantity' | 'unit' | 'location' | 'food_date' | 'date_type' | 'note'
>;

export function normalizePantryName(name: string): string {
	return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function validTimezone(value: string): boolean {
	try {
		new Intl.DateTimeFormat('en', { timeZone: value }).format();
		return value.length <= 100;
	} catch {
		return false;
	}
}

/** Calendar date in the pantry's timezone; never parse a food date as a local timestamp. */
export function pantryToday(timezone: string, now = new Date()): string {
	const parts = new Intl.DateTimeFormat('en', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(now);
	const part = (type: string) => parts.find((p) => p.type === type)!.value;
	return `${part('year')}-${part('month')}-${part('day')}`;
}

export function isCalendarDate(value: string): boolean {
	return (
		/^\d{4}-\d{2}-\d{2}$/.test(value) &&
		value >= '0001-01-01' &&
		!Number.isNaN(Date.parse(value)) &&
		new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
	);
}

export function dateDistance(date: string, today: string): number {
	return Math.round(
		(Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
	);
}

export function pantryDateState(
	date: string | null,
	today: string,
	warningDays: number
): PantryDateState {
	if (!date) return 'undated';
	const days = dateDistance(date, today);
	return days < 0 ? 'past' : days === 0 ? 'today' : days <= warningDays ? 'soon' : 'later';
}

export function parseLotInput(raw: Record<string, unknown>): LotInput | null {
	const name = typeof raw.name === 'string' ? raw.name.trim() : '';
	const quantityRaw = raw.quantity == null ? '' : String(raw.quantity).trim();
	const quantity = quantityRaw === '' ? null : Number(quantityRaw.replace(',', '.'));
	const location = String(raw.location ?? '');
	const foodDate = raw.food_date == null || raw.food_date === '' ? null : String(raw.food_date);
	const dateType = raw.date_type == null || raw.date_type === '' ? null : String(raw.date_type);
	const unit = String(raw.unit ?? '').trim() || null;
	const note = String(raw.note ?? '').trim() || null;
	if (!name || name.length > 160 || (unit?.length ?? 0) > 40 || (note?.length ?? 0) > 1000)
		return null;
	if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1e12))
		return null;
	if (!PANTRY_LOCATIONS.includes(location as LotInput['location'])) return null;
	if (
		foodDate
			? !isCalendarDate(foodDate) || !['use_by', 'best_before'].includes(dateType ?? '')
			: dateType !== null
	)
		return null;
	return {
		name,
		quantity,
		unit,
		location: location as LotInput['location'],
		food_date: foodDate,
		date_type: dateType as LotInput['date_type'],
		note
	};
}

export function sortPantryLots(lots: PantryLot[]): PantryLot[] {
	return lots.toSorted(
		(a, b) =>
			(a.food_date ?? '9999-99-99').localeCompare(b.food_date ?? '9999-99-99') ||
			a.name.localeCompare(b.name) ||
			a.id.localeCompare(b.id)
	);
}

export function pantryCounts(lots: PantryLot[], pantry: Pantry, now = new Date()) {
	const today = pantryToday(pantry.timezone, now);
	let due = 0,
		past = 0;
	for (const lot of lots) {
		if (lot.status !== 'active') continue;
		const state = pantryDateState(lot.food_date, today, pantry.warning_days);
		if (state === 'past') past++;
		if (state === 'today' || state === 'soon') due++;
	}
	return { due, past };
}

type MatchableRecipe = { id: string; title: string; ingredients: unknown };

/** Call only with recipes visible through the signed-in client's existing RLS policies. */
export function rankPantryRecipes<T extends MatchableRecipe>(
	recipes: T[],
	lots: PantryLot[],
	today: string,
	warningDays: number,
	ingredient?: string
) {
	const available = new Map<string, PantryLot>();
	for (const lot of sortPantryLots(lots)) {
		if (lot.status !== 'active' || pantryDateState(lot.food_date, today, warningDays) === 'past')
			continue;
		const key = normalizePantryName(lot.name);
		if (!available.has(key)) available.set(key, lot);
	}
	const requested = ingredient ? normalizePantryName(ingredient) : null;
	return recipes
		.map((recipe) => {
			const names = new Map(
				parseIngredientsJson(recipe.ingredients).map((i) => [normalizePantryName(i.name), i.name])
			);
			const matches = [...names.keys()]
				.filter((key) => available.has(key))
				.map((key) => available.get(key)!);
			const due = matches.filter((lot) =>
				['today', 'soon'].includes(pantryDateState(lot.food_date, today, warningDays))
			);
			return {
				recipe,
				matches,
				due,
				missing: [...names].filter(([key]) => !available.has(key)).map(([, name]) => name),
				requestedMatch: requested ? names.has(requested) : due.length > 0
			};
		})
		.filter((r) => r.requestedMatch)
		.toSorted(
			(a, b) =>
				b.due.length - a.due.length ||
				b.matches.length - a.matches.length ||
				a.recipe.title.localeCompare(b.recipe.title) ||
				a.recipe.id.localeCompare(b.recipe.id)
		);
}
