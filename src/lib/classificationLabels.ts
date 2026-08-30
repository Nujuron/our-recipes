import { type RecipeCourse, type RecipeEffort } from '$lib/classifications';
import * as m from '$lib/paraglide/messages';

const COURSE_LABELS: Record<RecipeCourse, () => string> = {
	breakfast: m.course_breakfast,
	starter: m.course_starter,
	main: m.course_main,
	side: m.course_side,
	dessert: m.course_dessert,
	snack: m.course_snack,
	drink: m.course_drink
};

const EFFORT_LABELS: Record<RecipeEffort, () => string> = {
	under_30: m.effort_under_30,
	'30_60': m.effort_30_60,
	over_60: m.effort_over_60
};

export function courseLabel(course: RecipeCourse): string {
	return COURSE_LABELS[course]();
}

export function effortLabel(effort: RecipeEffort): string {
	return EFFORT_LABELS[effort]();
}
