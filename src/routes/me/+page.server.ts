import { redirect } from '@sveltejs/kit';
import { parseRecipeListFilters, loadMyRecipes } from '$lib/recipes';
import { loadPantrySummary } from '$lib/server/pantry';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	if (!user) {
		redirect(303, '/login?redirectTo=/me');
	}

	const filters = parseRecipeListFilters(url);

	return {
		...filters,
		pantrySummary: loadPantrySummary(locals.supabase),
		recipes: loadMyRecipes(locals.supabase, user.id, filters)
	};
};
