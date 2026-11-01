import { describe, expect, it } from 'vitest';
import type { PantryLot } from './database.types';
import {
	isCalendarDate,
	normalizePantryName,
	pantryDateState,
	pantryToday,
	parseLotInput,
	rankPantryRecipes,
	sortPantryLots
} from './pantry';

const lot = (patch: Partial<PantryLot> = {}): PantryLot => ({
	id: 'lot-1',
	pantry_id: 'p',
	name: 'Arroz',
	quantity: 2,
	unit: 'kg',
	location: 'pantry',
	food_date: '2026-11-02',
	date_type: 'use_by',
	note: null,
	status: 'active',
	version: 1,
	created_at: '',
	updated_at: '',
	...patch
});

describe('pantry calendar dates', () => {
	it('uses the pantry timezone on opposite sides of midnight', () => {
		const instant = new Date('2026-11-01T00:30:00Z');
		expect(pantryToday('Atlantic/Canary', instant)).toBe('2026-11-01');
		expect(pantryToday('America/Los_Angeles', instant)).toBe('2026-10-31');
	});
	it.each([
		['2026-12-31', '2027-01-01', 3, 'past'],
		['2027-01-01', '2027-01-01', 3, 'today'],
		['2027-01-04', '2027-01-01', 3, 'soon'],
		['2027-01-05', '2027-01-01', 3, 'later'],
		['2026-03-30', '2026-03-28', 2, 'soon'],
		['2026-10-26', '2026-10-24', 2, 'soon'],
		['2024-03-01', '2024-02-28', 2, 'soon'],
		['2026-11-02', '2026-11-01', 0, 'later'],
		[null, '2026-11-01', 3, 'undated']
	])('classifies %s from %s', (date, today, days, state) => {
		expect(pantryDateState(date, today, days)).toBe(state);
	});
	it('rejects rolled-over dates and accepts leap dates', () => {
		expect(isCalendarDate('2026-02-29')).toBe(false);
		expect(isCalendarDate('2024-02-29')).toBe(true);
		expect(isCalendarDate('2026-04-31')).toBe(false);
		expect(isCalendarDate('0000-01-01')).toBe(false);
	});
	it('keeps undated items last without merging batches', () => {
		expect(
			sortPantryLots([
				lot({ id: 'undated', food_date: null }),
				lot({ id: 'later', food_date: '2026-11-03' }),
				lot({ id: 'first' })
			]).map((l) => l.id)
		).toEqual(['first', 'later', 'undated']);
	});
});

describe('pantry validation and matching', () => {
	it('allows unknown quantities but rejects zero, negative and non-finite amounts', () => {
		expect(parseLotInput({ ...lot(), quantity: '' })?.quantity).toBeNull();
		for (const quantity of [0, -1, 'NaN', 'Infinity', 1e13])
			expect(parseLotInput({ ...lot(), quantity })).toBeNull();
		expect(parseLotInput({ ...lot(), quantity: '1,5' })?.quantity).toBe(1.5);
	});
	it('requires a paired date and type', () => {
		expect(parseLotInput({ ...lot(), date_type: null })).toBeNull();
		expect(parseLotInput({ ...lot(), food_date: null })).toBeNull();
		expect(parseLotInput({ ...lot(), food_date: null, date_type: null })).not.toBeNull();
	});
	it('normalizes accents and whitespace while preserving product differences', () => {
		expect(normalizePantryName('  ATÚN  fresco ')).toBe('atun fresco');
		expect(normalizePantryName('tomate')).not.toBe(normalizePantryName('tomates'));
		expect(normalizePantryName('tomate')).not.toBe(normalizePantryName('tomate picado'));
	});
	it('counts distinct ingredients, ignores past and closed batches, and breaks ties by other matches', () => {
		const recipes = [
			{
				id: 'a',
				title: 'Arroz',
				ingredients: [{ name: 'Arroz' }, { name: 'ARROZ' }, { name: 'tomates' }]
			},
			{
				id: 'b',
				title: 'Arroz con atún',
				ingredients: [
					{ name: 'arroz', quantity: '100', unit: 'g' },
					{ name: 'atún' },
					{ name: 'leche' },
					{ name: 'queso' }
				]
			}
		];
		const result = rankPantryRecipes(
			recipes,
			[
				lot(),
				lot({ id: 'l2' }),
				lot({ id: 't', name: 'tomate' }),
				lot({ id: 'at', name: 'ATUN', food_date: null, date_type: null }),
				lot({ id: 'mi', name: 'leche', food_date: '2026-10-31' }),
				lot({ id: 'ch', name: 'queso', status: 'finished' })
			],
			'2026-11-01',
			3
		);
		expect(result.map((r) => r.recipe.id)).toEqual(['b', 'a']);
		expect(result[0].due).toHaveLength(1);
		expect(result[0].matches).toHaveLength(2);
		expect(result[0].missing).toEqual(['leche', 'queso']);
		expect(result[1].missing).toEqual(['tomates']);
	});
	it('requires a due ingredient for automatic suggestions, but allows explicit ingredient searches', () => {
		const recipes = [{ id: 'x', title: 'Soup', ingredients: [{ name: 'Arroz' }] }];
		expect(
			rankPantryRecipes(recipes, [lot({ food_date: null, date_type: null })], '2026-11-01', 3)
		).toHaveLength(0);
		expect(rankPantryRecipes(recipes, [], '2026-11-01', 3, 'arroz')).toHaveLength(1);
	});
});
