import { describe, expect, it } from 'vitest';
import {
	formatCookFor,
	formatIngredientAmount,
	formatScaledQuantity,
	isScalableQuantity,
	parseIngredientLine,
	parseIngredientLines,
	parseIngredientsJson,
	parseQuantityNumber,
	parseServings,
	scaleFactorFromQuantity,
	scaleQuantity,
	stepCookFor
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
		expect(parseIngredientsJson(json)).toEqual([{ name: 'arroz', quantity: '140', unit: 'g' }]);
	});

	it('formats amount for display', () => {
		expect(formatIngredientAmount({ name: 'arroz', quantity: '140', unit: 'g' })).toBe('140 g');
	});

	it('parses numeric quantities including decimals and fractions', () => {
		expect(parseQuantityNumber('140')).toBe(140);
		expect(parseQuantityNumber('1.5')).toBe(1.5);
		expect(parseQuantityNumber('1,5')).toBe(1.5);
		expect(parseQuantityNumber('1/2')).toBe(0.5);
		expect(parseQuantityNumber('1 1/2')).toBe(1.5);
		expect(parseQuantityNumber('to taste')).toBeNull();
		expect(parseQuantityNumber('')).toBeNull();
	});

	it('formats scaled quantities without trailing zeros', () => {
		expect(formatScaledQuantity(400)).toBe('400');
		expect(formatScaledQuantity(1.5)).toBe('1.5');
		expect(formatScaledQuantity(0.25)).toBe('0.25');
		expect(formatScaledQuantity(1.333)).toBe('1.33');
	});

	it('scales numeric quantities and leaves non-numeric values unchanged', () => {
		expect(scaleQuantity('400', 0.5)).toBe('200');
		expect(scaleQuantity('1/2', 3)).toBe('1.5');
		expect(scaleQuantity('1,5', 2)).toBe('3');
		expect(scaleQuantity('140', 1)).toBe('140');
		expect(scaleQuantity('to taste', 2)).toBe('to taste');
		expect(scaleQuantity(null, 2)).toBeNull();
	});

	it('parses servings within bounds', () => {
		expect(parseServings('4')).toBe(4);
		expect(parseServings('0')).toBeNull();
		expect(parseServings('100')).toBeNull();
		expect(parseServings('abc')).toBeNull();
	});

	it('derives a scale factor from one ingredient quantity', () => {
		expect(scaleFactorFromQuantity('200', '300')).toBe(1.5);
		expect(scaleFactorFromQuantity('1/2', '1')).toBe(2);
		expect(scaleFactorFromQuantity('1,5', '3')).toBe(2);
		expect(scaleFactorFromQuantity('to taste', '3')).toBeNull();
		expect(scaleFactorFromQuantity('200', '0')).toBeNull();
		expect(scaleFactorFromQuantity('0', '100')).toBeNull();
	});

	it('treats positive numeric quantities as scalable', () => {
		expect(isScalableQuantity('140')).toBe(true);
		expect(isScalableQuantity('to taste')).toBe(false);
		expect(isScalableQuantity(null)).toBe(false);
	});

	it('steps people up and down from fractional counts', () => {
		expect(stepCookFor(4, 1)).toBe(5);
		expect(stepCookFor(4, -1)).toBe(3);
		expect(stepCookFor(4.2, 1)).toBe(5);
		expect(stepCookFor(4.2, -1)).toBe(4);
		expect(stepCookFor(1, -1)).toBe(1);
		expect(stepCookFor(99, 1)).toBe(99);
	});

	it('formats people counts with at most one decimal', () => {
		expect(formatCookFor(4)).toBe('4');
		expect(formatCookFor(4.2)).toBe('4.2');
		expect(formatCookFor(4.25)).toBe('4.3');
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
