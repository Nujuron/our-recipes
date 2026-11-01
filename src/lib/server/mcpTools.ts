export type McpActor = { userId: string; origin: string; token: string };
export type McpContext = { http?: { authInfo?: { token?: string; extra?: unknown } } };

export function jsonResult(value: unknown) {
	return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

export function errorResult(message: string) {
	return { content: [{ type: 'text' as const, text: message }], isError: true };
}

export function actor(ctx: McpContext): McpActor | null {
	const info = ctx.http?.authInfo;
	const extra = info?.extra as { userId?: string; origin?: string } | undefined;
	if (!info?.token || !extra?.userId) return null;
	return { userId: extra.userId, origin: extra.origin ?? '', token: info.token };
}
