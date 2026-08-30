export const COURSES = [
	'breakfast',
	'starter',
	'main',
	'side',
	'dessert',
	'snack',
	'drink'
] as const;

export const EFFORTS = ['under_30', '30_60', 'over_60'] as const;

export type RecipeCourse = (typeof COURSES)[number];
export type RecipeEffort = (typeof EFFORTS)[number];

const COURSE_SET = new Set<string>(COURSES);
const EFFORT_SET = new Set<string>(EFFORTS);

export function isRecipeCourse(value: unknown): value is RecipeCourse {
	return typeof value === 'string' && COURSE_SET.has(value);
}

export function isRecipeEffort(value: unknown): value is RecipeEffort {
	return typeof value === 'string' && EFFORT_SET.has(value);
}

function asTrimmedString(raw: unknown): string {
	return typeof raw === 'string' ? raw.trim() : '';
}

/** Empty or invalid values become null so saves never fail on classification. */
export function parseRecipeCourse(raw: unknown): RecipeCourse | null {
	const value = asTrimmedString(raw);
	return isRecipeCourse(value) ? value : null;
}

export function parseRecipeEffort(raw: unknown): RecipeEffort | null {
	const value = asTrimmedString(raw);
	return isRecipeEffort(value) ? value : null;
}
