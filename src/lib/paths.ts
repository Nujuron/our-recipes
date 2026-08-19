/** True for same-origin app paths. Rejects protocol-relative URLs like `//evil.example`. */
export function isSafeInternalPath(path: string): boolean {
	return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\');
}

export function recipeEditPath(recipeId: string): string {
	return `/recipes/${recipeId}/edit`;
}

export function recipeEditUrl(origin: string, recipeId: string): string {
	return `${origin.replace(/\/$/, '')}${recipeEditPath(recipeId)}`;
}
