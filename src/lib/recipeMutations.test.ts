import { describe, expect, it } from 'vitest';
import { isSafeInternalPath, recipeEditUrl } from './paths';
import { isRecipeId, normalizeRecipeWrite } from './recipeMutations';

describe('isSafeInternalPath', () => {
	it('accepts app paths including query strings', () => {
		expect(isSafeInternalPath('/oauth/consent?authorization_id=abc')).toBe(true);
		expect(isSafeInternalPath('/me')).toBe(true);
	});

	it('rejects protocol-relative and external targets', () => {
		expect(isSafeInternalPath('//evil.example')).toBe(false);
		expect(isSafeInternalPath('/\\evil.example')).toBe(false);
		expect(isSafeInternalPath('https://evil.example')).toBe(false);
	});
});

describe('normalizeRecipeWrite', () => {
	const valid = {
		title: '  Pie  ',
		body_md: 'Bake it.',
		servings: 4,
		ingredients: [{ name: 'flour', quantity: '2', unit: 'cups' }],
		steps: ['Mix', 'Bake'],
		summary: 'A pie',
		locale: 'es',
		is_public: 'on'
	};

	it('normalizes a complete payload', () => {
		const result = normalizeRecipeWrite(valid);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.fields.title).toBe('Pie');
		expect(result.fields.locale).toBe('es');
		expect(result.fields.is_public).toBe(true);
		expect(result.fields.steps).toBe('Mix\nBake');
		expect(result.fields.ingredients).toEqual([{ name: 'flour', quantity: '2', unit: 'cups' }]);
		expect(result.fields.allergens).toEqual([]);
	});

	it('parses allergens into canonical unique order', () => {
		const result = normalizeRecipeWrite({
			...valid,
			allergens: ['milk', 'gluten', 'milk', 'nope']
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.fields.allergens).toEqual(['gluten', 'milk']);
	});

	it('rejects missing title, body, or servings', () => {
		expect(normalizeRecipeWrite({ ...valid, title: ' ' }).ok).toBe(false);
		expect(normalizeRecipeWrite({ ...valid, body_md: '' }).ok).toBe(false);
		expect(normalizeRecipeWrite({ ...valid, servings: 0 }).ok).toBe(false);
	});

	it('merges patches onto existing fields', () => {
		const base = normalizeRecipeWrite(valid);
		if (!base.ok) throw new Error('expected valid base');

		const patched = normalizeRecipeWrite({ title: 'Tart' }, base.fields);
		expect(patched.ok).toBe(true);
		if (!patched.ok) return;
		expect(patched.fields.title).toBe('Tart');
		expect(patched.fields.body_md).toBe('Bake it.');
		expect(patched.fields.is_public).toBe(true);
		expect(patched.fields.allergens).toEqual([]);

		const withAllergens = normalizeRecipeWrite({ ...valid, allergens: ['eggs', 'soy'] });
		if (!withAllergens.ok) throw new Error('expected allergens base');
		const kept = normalizeRecipeWrite({ title: 'Tart' }, withAllergens.fields);
		expect(kept.ok).toBe(true);
		if (!kept.ok) return;
		expect(kept.fields.allergens).toEqual(['eggs', 'soy']);
	});
});

describe('isRecipeId', () => {
	it('accepts UUIDs', () => {
		expect(isRecipeId('20000000-0000-4000-8000-000000000001')).toBe(true);
		expect(isRecipeId('not-a-uuid')).toBe(false);
	});
});

describe('recipeEditUrl', () => {
	it('joins origin and path without a double slash', () => {
		expect(recipeEditUrl('https://example.com/', '20000000-0000-4000-8000-000000000001')).toBe(
			'https://example.com/recipes/20000000-0000-4000-8000-000000000001/edit'
		);
	});
});
