import type { LayoutServerLoad } from './$types';
import type { Database } from '$lib/database.types';

type Profile = Pick<
	Database['public']['Tables']['profiles']['Row'],
	'display_name' | 'preferred_locale' | 'avatar_url'
>;

export const load: LayoutServerLoad = async ({ cookies, locals }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();

	let profile: Profile | null = null;

	if (user) {
		const { data } = await locals.supabase
			.from('profiles')
			.select('display_name, preferred_locale, avatar_url')
			.eq('id', user.id)
			.maybeSingle();
		profile = data;
	}

	return {
		cookies: cookies.getAll(),
		user,
		profile
	};
};
