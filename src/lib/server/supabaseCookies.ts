/** Drop Cache-Control so SvelteKit does not throw when cookies were already written. */
export function headersWithoutCacheControl(
	headers: Record<string, string> | undefined
): Record<string, string> {
	if (!headers) return {};

	const next: Record<string, string> = {};
	for (const [name, value] of Object.entries(headers)) {
		if (name.toLowerCase() === 'cache-control') continue;
		next[name] = value;
	}
	return next;
}
