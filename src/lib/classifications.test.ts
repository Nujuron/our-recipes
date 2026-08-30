import { describe, expect, it } from 'vitest';
import {
	COURSES,
	EFFORTS,
	isRecipeCourse,
	isRecipeEffort,
	parseRecipeCourse,
	parseRecipeEffort
} from './classifications';

describe('isRecipeCourse', () => {
	it('accepts the dinner-browse courses', () => {
		expect(isRecipeCourse('main')).toBe(true);
		expect(isRecipeCourse('starter')).toBe(true);
		expect(isRecipeCourse('lunch')).toBe(false);
		expect(isRecipeCourse('')).toBe(false);
	});
});

describe('isRecipeEffort', () => {
	it('accepts the time bands', () => {
		expect(isRecipeEffort('under_30')).toBe(true);
		expect(isRecipeEffort('30_60')).toBe(true);
		expect(isRecipeEffort('over_60')).toBe(true);
		expect(isRecipeEffort('quick')).toBe(false);
	});
});

describe('parseRecipeCourse', () => {
	it('returns null for empty or invalid input', () => {
		expect(parseRecipeCourse(undefined)).toBeNull();
		expect(parseRecipeCourse(null)).toBeNull();
		expect(parseRecipeCourse('')).toBeNull();
		expect(parseRecipeCourse('  ')).toBeNull();
		expect(parseRecipeCourse('brunch')).toBeNull();
	});

	it('accepts every canonical course', () => {
		for (const course of COURSES) {
			expect(parseRecipeCourse(course)).toBe(course);
		}
	});
});

describe('parseRecipeEffort', () => {
	it('returns null for empty or invalid input', () => {
		expect(parseRecipeEffort(undefined)).toBeNull();
		expect(parseRecipeEffort(null)).toBeNull();
		expect(parseRecipeEffort('')).toBeNull();
		expect(parseRecipeEffort('weekend')).toBeNull();
	});

	it('accepts every canonical effort band', () => {
		for (const effort of EFFORTS) {
			expect(parseRecipeEffort(effort)).toBe(effort);
		}
	});
});
