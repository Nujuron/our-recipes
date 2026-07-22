import { json } from '@sveltejs/kit';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin';
import {
	getRecipeViewerCookie,
	isSameOrigin,
	isUuid,
	recordRecipeView
} from '$lib/server/recipeViews';
import type { RequestHandler } from './$types';

const responseHeaders = {
	'cache-control': 'no-store'
};

export const POST: RequestHandler = async ({ request, url, params, cookies, locals }) => {
	if (!isSameOrigin(request, url)) {
		return json({ error: 'forbidden' }, { status: 403, headers: responseHeaders });
	}

	if (!isUuid(params.id)) {
		return json({ error: 'not_found' }, { status: 404, headers: responseHeaders });
	}

	const token = getRecipeViewerCookie(cookies);
	if (!token) {
		return json({ error: 'not_found' }, { status: 404, headers: responseHeaders });
	}

	try {
		const {
			data: { user },
			error: authError
		} = await locals.supabase.auth.getUser();

		if (authError) {
			return json({ error: 'unavailable' }, { status: 503, headers: responseHeaders });
		}

		const result = await recordRecipeView(getSupabaseAdmin(), params.id, token, user?.id ?? null);

		if (result.kind === 'not_found') {
			return json({ error: 'not_found' }, { status: 404, headers: responseHeaders });
		}

		if (result.kind === 'error') {
			return json({ error: 'unavailable' }, { status: 503, headers: responseHeaders });
		}

		return json(
			{ counted: result.counted, viewCount: result.viewCount },
			{ headers: responseHeaders }
		);
	} catch {
		return json({ error: 'unavailable' }, { status: 503, headers: responseHeaders });
	}
};
