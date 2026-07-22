import { loadPublicRecipes } from '$lib/recipes';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';

	return {
		q,
		// Stream so navigation can finish before the query resolves
		recipes: loadPublicRecipes(locals.supabase, q)
	};
};
