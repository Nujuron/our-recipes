/** One ingredient per line; leading bullets are optional. */
export function parseIngredientLines(ingredients: string | null | undefined): string[] {
	if (!ingredients) return [];

	return ingredients
		.split(/\r?\n/)
		.map((line) => line.replace(/^[-*•]\s+/, '').trim())
		.filter(Boolean);
}

/** Convert stored ingredients to a markdown bullet list for TipTap. */
export function ingredientsToMarkdown(ingredients: string | null | undefined): string {
	const lines = parseIngredientLines(ingredients);
	if (lines.length === 0) return '';
	return lines.map((line) => `- ${line}`).join('\n');
}

/** Serialize TipTap markdown output back to stored ingredient lines. */
export function ingredientsFromMarkdown(markdown: string): string {
	return parseIngredientLines(markdown).join('\n');
}

/** Normalize form input for storage; empty becomes null. */
export function normalizeIngredients(raw: string): string | null {
	const lines = parseIngredientLines(raw);
	return lines.length > 0 ? lines.join('\n') : null;
}
