import { describe, expect, it } from 'vitest';
import { ALLERGENS, isAllergen, parseAllergens, toPostgresArrayLiteral } from './allergens';

describe('isAllergen', () => {
	it('accepts the EU-14 identifiers', () => {
		expect(isAllergen('gluten')).toBe(true);
		expect(isAllergen('sulphites')).toBe(true);
		expect(isAllergen('tree_nuts')).toBe(false);
		expect(isAllergen('')).toBe(false);
	});
});

describe('parseAllergens', () => {
	it('returns an empty list for missing input', () => {
		expect(parseAllergens(undefined)).toEqual([]);
		expect(parseAllergens(null)).toEqual([]);
		expect(parseAllergens('')).toEqual([]);
	});

	it('filters invalid values and keeps canonical unique order', () => {
		expect(parseAllergens(['milk', 'gluten', 'milk', 'nope'])).toEqual(['gluten', 'milk']);
	});

	it('parses a JSON array string', () => {
		expect(parseAllergens('["eggs","fish"]')).toEqual(['eggs', 'fish']);
	});

	it('covers the full EU-14 set', () => {
		expect(parseAllergens([...ALLERGENS].reverse())).toEqual([...ALLERGENS]);
	});

	it('accepts repeated query params from a GET form', () => {
		expect(parseAllergens(['milk', 'nope', 'gluten'])).toEqual(['gluten', 'milk']);
	});
});

describe('toPostgresArrayLiteral', () => {
	it('formats a PostgREST overlap value', () => {
		expect(toPostgresArrayLiteral(['gluten', 'milk'])).toBe('{gluten,milk}');
	});
});
