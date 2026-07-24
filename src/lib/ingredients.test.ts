import { describe, expect, it } from 'vitest';
import {
	formatIngredientAmount,
	parseIngredientLine,
	parseIngredientLines,
	parseIngredientsJson
} from './ingredients';
import { deriveStepsFromBody, parseStepLines, resolveCookingSteps } from './steps';

describe('ingredients', () => {
	it('parses quantity, unit, and name', () => {
		expect(parseIngredientLine('140 g arroz')).toEqual({
			quantity: '140',
			unit: 'g',
			name: 'arroz'
		});
	});

	it('falls back to name-only lines', () => {
		expect(parseIngredientLine('sal')).toEqual({
			quantity: null,
			unit: null,
			name: 'sal'
		});
	});

	it('imports legacy lines', () => {
		expect(parseIngredientLines('2 cups flour\nsal')).toEqual([
			{ quantity: '2', unit: 'cups', name: 'flour' },
			{ quantity: null, unit: null, name: 'sal' }
		]);
	});

	it('parses json form input', () => {
		const json = JSON.stringify([{ name: 'arroz', quantity: '140', unit: 'g' }]);
		expect(parseIngredientsJson(json)).toEqual([
			{ name: 'arroz', quantity: '140', unit: 'g' }
		]);
	});

	it('formats amount for display', () => {
		expect(formatIngredientAmount({ name: 'arroz', quantity: '140', unit: 'g' })).toBe('140 g');
	});
});

describe('steps', () => {
	it('parses explicit step lines', () => {
		expect(parseStepLines('1. Heat pan\n2. Add rice')).toEqual(['Heat pan', 'Add rice']);
	});

	it('derives ordered list steps from body', () => {
		const body = 'Intro\n\n1. Heat pan\n2. Add rice';
		expect(deriveStepsFromBody(body)).toEqual(['Heat pan', 'Add rice']);
	});

	it('prefers explicit steps over body', () => {
		expect(
			resolveCookingSteps({
				steps: 'Custom step',
				bodyMd: '1. Ignored step'
			})
		).toEqual(['Custom step']);
	});
});
