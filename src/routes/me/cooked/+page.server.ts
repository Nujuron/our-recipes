import { redirect } from '@sveltejs/kit';
import { loadCookedRecipes } from '$lib/recipes';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	if (!user) {
		redirect(303, '/login?redirectTo=/me/cooked');
	}

	return {
		recipes: loadCookedRecipes(locals.supabase, user.id)
	};
};
