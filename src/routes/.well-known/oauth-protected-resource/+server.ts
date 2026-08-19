import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mcpResourceMetadata } from '$lib/server/mcpServer';

export const GET: RequestHandler = ({ request }) => {
	return json(mcpResourceMetadata(request), {
		headers: {
			'Cache-Control': 'max-age=3600',
			'Access-Control-Allow-Origin': '*'
		}
	});
};

export const OPTIONS: RequestHandler = () =>
	new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': '*',
			'Access-Control-Max-Age': '86400'
		}
	});
