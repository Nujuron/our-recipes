import { redirect } from '@sveltejs/kit';
import { parseRecipeListFilters } from '$lib/recipes';
import { loadPantrySuggestions } from '$lib/server/pantry';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();
	if (!user) redirect(303, '/login?redirectTo=/pantry');
	const filters = parseRecipeListFilters(url);
	const pantryId = url.searchParams.get('pantry');
	const ingredient = (url.searchParams.get('ingredient') ?? '').slice(0, 160);
	return {
		...filters,
		pantryId,
		ingredient,
		suggestions: loadPantrySuggestions(locals.supabase, pantryId, ingredient, filters)
	};
};
