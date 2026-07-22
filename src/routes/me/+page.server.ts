import { redirect } from '@sveltejs/kit';
import { loadMyRecipes } from '$lib/recipes';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	if (!user) {
		redirect(303, '/login?redirectTo=/me');
	}

	return {
		recipes: loadMyRecipes(locals.supabase, user.id)
	};
};
