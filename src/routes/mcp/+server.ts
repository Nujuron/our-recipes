import type { RequestHandler } from './$types';
import { mcpRequestHandler } from '$lib/server/mcpServer';

export const GET: RequestHandler = ({ request }) => mcpRequestHandler(request);
export const POST: RequestHandler = ({ request }) => mcpRequestHandler(request);
export const DELETE: RequestHandler = ({ request }) => mcpRequestHandler(request);
export const OPTIONS: RequestHandler = ({ request }) => mcpRequestHandler(request);
