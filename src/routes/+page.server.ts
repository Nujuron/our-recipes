import { parseRecipeListFilters, loadPublicRecipes } from '$lib/recipes';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const filters = parseRecipeListFilters(url);

	return {
		q,
		...filters,
		// Stream so navigation can finish before the query resolves
		recipes: loadPublicRecipes(locals.supabase, q, filters)
	};
};
