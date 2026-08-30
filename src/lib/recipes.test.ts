import { describe, expect, it } from 'vitest';
import { parseRecipeListFilters } from './recipes';

describe('parseRecipeListFilters', () => {
	it('reads course, effort, and exclude query params', () => {
		const url = new URL(
			'https://example.test/?course=main&effort=under_30&exclude=milk&exclude=gluten'
		);
		expect(parseRecipeListFilters(url)).toEqual({
			course: 'main',
			effort: 'under_30',
			excludeAllergens: ['gluten', 'milk']
		});
	});

	it('ignores invalid values', () => {
		const url = new URL('https://example.test/?course=brunch&exclude=tree_nuts&exclude=eggs');
		expect(parseRecipeListFilters(url)).toEqual({
			course: null,
			effort: null,
			excludeAllergens: ['eggs']
		});
	});
});
