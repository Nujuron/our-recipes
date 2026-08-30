import { redirect } from '@sveltejs/kit';
import { parseRecipeListFilters, loadMyRecipes } from '$lib/recipes';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	if (!user) {
		redirect(303, '/login?redirectTo=/me');
	}

	const filters = parseRecipeListFilters(url);

	return {
		...filters,
		recipes: loadMyRecipes(locals.supabase, user.id, filters)
	};
};
