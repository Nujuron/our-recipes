import { describe, expect, it } from 'vitest';
import { operationLotId, purchaseLots } from './pantryMutations';
import { isRecipeId } from '$lib/recipeMutations';

const operation = '50000000-0000-4000-8000-000000000001';
describe('MCP receipt normalization', () => {
	it('derives stable standard UUIDv5 IDs that the website accepts', () => {
		expect(operationLotId('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'www.example.com')).toBe(
			'2ed6657d-e927-568b-95e1-2665a8aea6a2'
		);
		expect(operationLotId(operation, 'line-1')).toBe(operationLotId(operation, 'line-1'));
		expect(operationLotId(operation, 'line-1')).not.toBe(operationLotId(operation, 'line-2'));
		expect(isRecipeId(operationLotId(operation, 'line-1'))).toBe(true);
	});
	it('never turns purchase dates or supplied extra fields into food dates', () => {
		const lots = purchaseLots(operation, [
			{
				line_id: '1',
				name: ' Leche ',
				quantity: null,
				food_date: '2026-11-01',
				date_type: 'use_by'
			} as never
		]);
		expect(lots[0]).toMatchObject({
			name: 'Leche',
			quantity: null,
			location: 'pantry',
			food_date: null,
			date_type: null
		});
	});
	it('rejects duplicate line keys, invalid quantities and empty purchases', () => {
		expect(() => purchaseLots(operation, [])).toThrow('invalid');
		expect(() => purchaseLots(operation, [{ line_id: '1', name: 'Arroz', quantity: -1 }])).toThrow(
			'invalid'
		);
		expect(() =>
			purchaseLots(operation, [
				{ line_id: '1', name: 'Arroz' },
				{ line_id: '1', name: 'Arroz' }
			])
		).toThrow('invalid');
	});
	it('keeps separate purchases and separate lines of the same food independent', () => {
		const items = [
			{ line_id: '1', name: 'Arroz', quantity: 1 },
			{ line_id: '2', name: 'Arroz', quantity: 2 }
		];
		const first = purchaseLots(operation, items);
		expect(first).toEqual(purchaseLots(operation, items));
		expect(first[0].id).not.toBe(first[1].id);
		expect(purchaseLots('50000000-0000-4000-8000-000000000002', items)[0].id).not.toBe(first[0].id);
	});
});
