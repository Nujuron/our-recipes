import { error, fail, redirect } from '@sveltejs/kit';
import {
	deleteFamily,
	leaveFamily,
	loadFamilyDetail,
	loadFamilyRecipes,
	removeFamilyMember,
	rotateFamilyInvite,
	setPrimaryFamily
} from '$lib/families';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	if (!user) {
		redirect(303, `/login?redirectTo=/families/${params.id}`);
	}

	const detail = await loadFamilyDetail(locals.supabase, user.id, params.id);
	if ('error' in detail) {
		error(404, 'not_found');
	}

	const origin = url.origin;
	const inviteUrl = detail.invite ? `${origin}${detail.invite.url}` : null;

	return {
		userId: user.id,
		family: detail.family,
		members: detail.members,
		inviteUrl,
		recipes: loadFamilyRecipes(locals.supabase, params.id)
	};
};

export const actions: Actions = {
	invite: async ({ locals, params }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { error: 'auth' });

		const rotated = await rotateFamilyInvite(locals.supabase, user.id, params.id);
		if ('error' in rotated) {
			return fail(500, { error: 'generic' });
		}
		return { form: 'invite', success: true };
	},

	primary: async ({ locals, params }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { error: 'auth' });

		const result = await setPrimaryFamily(locals.supabase, user.id, params.id);
		if ('error' in result) {
			return fail(result.error === 'forbidden' ? 403 : 500, { error: result.error });
		}
		return { form: 'primary', success: true };
	},

	leave: async ({ locals, params }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { error: 'auth' });

		const result = await leaveFamily(locals.supabase, user.id, params.id);
		if ('error' in result) {
			return fail(500, { error: 'generic' });
		}
		redirect(303, '/families');
	},

	remove: async ({ request, locals, params }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { error: 'auth' });

		const form = await request.formData();
		const memberId = String(form.get('member_id') ?? '');
		if (!memberId || memberId === user.id) {
			return fail(400, { error: 'generic' });
		}

		const result = await removeFamilyMember(locals.supabase, params.id, memberId);
		if ('error' in result) {
			return fail(500, { error: 'generic' });
		}
		return { form: 'remove', success: true };
	},

	delete: async ({ locals, params }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { error: 'auth' });

		const result = await deleteFamily(locals.supabase, params.id);
		if ('error' in result) {
			return fail(500, { error: 'generic' });
		}
		redirect(303, '/families');
	}
};
