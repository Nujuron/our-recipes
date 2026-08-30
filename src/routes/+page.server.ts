import { parseRecipeCourse, parseRecipeEffort } from '$lib/classifications';
import { loadPublicRecipes } from '$lib/recipes';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const course = parseRecipeCourse(url.searchParams.get('course'));
	const effort = parseRecipeEffort(url.searchParams.get('effort'));

	return {
		q,
		course,
		effort,
		// Stream so navigation can finish before the query resolves
		recipes: loadPublicRecipes(locals.supabase, q, { course, effort })
	};
};
