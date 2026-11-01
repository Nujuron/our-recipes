import { describe, expect, it } from 'vitest';
import type { ShoppingItem } from './shoppingList';
import {
	importedShoppingItems,
	persistPantryImport,
	shoppingSnapshot,
	type PantryImport
} from './pantryImport';

const item: ShoppingItem = {
	id: 'line-1',
	name: 'Arroz',
	quantity: '2',
	unit: 'kg',
	checked: true,
	sources: [],
	custom: true
};
const draft: PantryImport = {
	userId: 'u',
	operationId: 'op',
	pantryId: 'p',
	lines: [{ lineId: item.id, snapshot: shoppingSnapshot(item), lots: [] }]
};

describe('shopping import recovery', () => {
	it('only removes confirmed, unchanged purchased lines', () => {
		const items = [item, { ...item, id: 'line-2' }];
		expect(importedShoppingItems(items, draft.lines, [])).toEqual(items);
		expect(importedShoppingItems(items, draft.lines, [item.id])).toEqual([items[1]]);
		for (const change of [
			{ quantity: '3' },
			{ checked: false },
			{ unit: 'g' },
			{ name: 'Arroz integral' }
		]) {
			const changed = { ...item, ...change };
			expect(importedShoppingItems([changed], draft.lines, [item.id])).toEqual([changed]);
		}
	});
	it('can replay cleanup after the server committed but the app closed', () => {
		const recovered = JSON.parse(JSON.stringify(draft));
		const cleaned = importedShoppingItems([item], recovered.lines, [item.id]);
		expect(cleaned).toEqual([]);
		expect(importedShoppingItems(cleaned, recovered.lines, [item.id])).toEqual([]);
	});
	it('does not permit sending when local persistence fails', () => {
		expect(
			persistPantryImport(
				{
					setItem() {
						throw new Error('quota');
					}
				},
				draft
			)
		).toBe(false);
	});
});
