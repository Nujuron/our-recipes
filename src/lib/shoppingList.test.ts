import { describe, expect, it } from 'vitest';
import type { RecipeIngredient } from './ingredients';
import {
	addCustomItem,
	addIngredientToList,
	addMissingIngredients,
	clearCheckedItems,
	combineQuantities,
	hasAllIngredients,
	hasIngredient,
	ingredientKey,
	parseStoredShoppingList,
	removeItem,
	removeRecipeFromList,
	setItemChecked,
	toggleIngredientInList
} from './shoppingList';

const rice: RecipeIngredient = { name: 'Rice', quantity: '200', unit: 'g' };
const salt: RecipeIngredient = { name: 'salt', quantity: null, unit: null };
const moreRice: RecipeIngredient = { name: 'rice', quantity: '100', unit: 'g' };
const paella = { recipeId: 'p1', recipeTitle: 'Paella' };
const risotto = { recipeId: 'r1', recipeTitle: 'Risotto' };

function ids() {
	let n = 0;
	return () => `id-${++n}`;
}

describe('shoppingList', () => {
	it('keys ingredients by name and unit, ignoring case', () => {
		expect(ingredientKey('Rice', 'g')).toBe(ingredientKey('rice', 'G'));
		expect(ingredientKey('Rice', 'g')).not.toBe(ingredientKey('Rice', 'kg'));
	});

	it('sums numeric quantities and joins unmatched ones', () => {
		expect(combineQuantities('200', '100')).toBe('300');
		expect(combineQuantities('1/2', '1/2')).toBe('1');
		expect(combineQuantities(null, '2')).toBe('2');
		expect(combineQuantities('to taste', 'to taste')).toBe('to taste');
		expect(combineQuantities('2', 'to taste')).toBe('2 + to taste');
	});

	it('adds a new ingredient and merges a second with the same key', () => {
		const createId = ids();
		const once = addIngredientToList([], rice, paella, createId);
		expect(once).toEqual([
			{
				id: 'id-1',
				name: 'Rice',
				quantity: '200',
				unit: 'g',
				checked: false,
				sources: [paella],
				custom: false
			}
		]);

		const twice = addIngredientToList(once, moreRice, risotto, createId);
		expect(twice).toEqual([
			{
				id: 'id-1',
				name: 'Rice',
				quantity: '300',
				unit: 'g',
				checked: false,
				sources: [paella, risotto],
				custom: false
			}
		]);
	});

	it('toggles an ingredient on and off', () => {
		const createId = ids();
		const added = toggleIngredientInList([], salt, paella, createId);
		expect(hasIngredient(added, salt)).toBe(true);
		const removed = toggleIngredientInList(added, salt, paella, createId);
		expect(removed).toEqual([]);
	});

	it('adds only missing ingredients from a recipe', () => {
		const createId = ids();
		const withRice = addIngredientToList([], rice, paella, createId);
		const next = addMissingIngredients(withRice, [rice, salt], paella, createId);
		expect(next).toHaveLength(2);
		expect(next[0]?.quantity).toBe('200');
		expect(next[1]?.name).toBe('salt');
	});

	it('knows when every recipe ingredient is already in the list', () => {
		const createId = ids();
		const items = addMissingIngredients([], [rice, salt], paella, createId);
		expect(hasAllIngredients(items, [rice, salt])).toBe(true);
		expect(hasAllIngredients(items, [rice, { name: 'lemon', quantity: '1', unit: null }])).toBe(
			false
		);
		expect(hasAllIngredients([], [rice])).toBe(false);
	});

	it('removes items that only came from one recipe', () => {
		const createId = ids();
		const items = addMissingIngredients([], [rice, salt], paella, createId);
		const withRisotto = addIngredientToList(items, moreRice, risotto, createId);
		const next = removeRecipeFromList(withRisotto, paella.recipeId);
		expect(next).toHaveLength(1);
		expect(next[0]?.name).toBe('Rice');
		expect(next[0]?.sources).toEqual([risotto]);
	});

	it('keeps typed custom items when their recipe source is removed', () => {
		const createId = ids();
		const custom = addCustomItem([], '200 g Rice', createId);
		const withRecipe = addMissingIngredients(custom, [rice], paella, createId);
		const next = removeRecipeFromList(withRecipe, paella.recipeId);
		expect(next).toHaveLength(1);
		expect(next[0]).toMatchObject({ name: 'Rice', custom: true, sources: [] });
	});

	it('checks, removes, and clears bought items', () => {
		const createId = ids();
		const items = addMissingIngredients([], [rice, salt], paella, createId);
		const checked = setItemChecked(items, 'id-1', true);
		expect(checked[0]?.checked).toBe(true);
		expect(clearCheckedItems(checked)).toEqual([items[1]]);
		expect(removeItem(items, 'id-2')).toEqual([items[0]]);
	});

	it('parses a custom typed line into an ingredient', () => {
		const items = addCustomItem([], '140 g arroz', ids());
		expect(items[0]).toMatchObject({ name: 'arroz', quantity: '140', unit: 'g', custom: true });
	});

	it('parses stored json and drops invalid rows', () => {
		expect(
			parseStoredShoppingList(
				JSON.stringify([
					{ id: 'a', name: 'Rice', quantity: '200', unit: 'g', checked: true, sources: [paella] },
					{ name: '' },
					{ id: 'b', name: 'Salt' }
				])
			)
		).toEqual([
			{
				id: 'a',
				name: 'Rice',
				quantity: '200',
				unit: 'g',
				checked: true,
				sources: [paella],
				custom: false
			},
			{
				id: 'b',
				name: 'Salt',
				quantity: null,
				unit: null,
				checked: false,
				sources: [],
				custom: false
			}
		]);
		expect(parseStoredShoppingList('not-json')).toEqual([]);
		expect(parseStoredShoppingList(null)).toEqual([]);
	});
});
