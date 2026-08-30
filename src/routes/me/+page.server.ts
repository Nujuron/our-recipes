import { redirect } from '@sveltejs/kit';
import { parseRecipeCourse, parseRecipeEffort } from '$lib/classifications';
import { loadMyRecipes } from '$lib/recipes';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	if (!user) {
		redirect(303, '/login?redirectTo=/me');
	}

	const course = parseRecipeCourse(url.searchParams.get('course'));
	const effort = parseRecipeEffort(url.searchParams.get('effort'));

	return {
		course,
		effort,
		recipes: loadMyRecipes(locals.supabase, user.id, { course, effort })
	};
};
