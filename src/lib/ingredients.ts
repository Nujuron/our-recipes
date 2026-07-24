export type RecipeIngredient = {
	name: string;
	quantity: string | null;
	unit: string | null;
};

const BULLET_PREFIX = /^[-*•]\s+/;
const QTY_UNIT_NAME =
	/^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s+([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ.]+)\s+(.+)$/u;

/** Parse one free-text ingredient line into structured fields. */
export function parseIngredientLine(line: string): RecipeIngredient {
	const cleaned = line.replace(BULLET_PREFIX, '').trim();
	if (!cleaned) {
		return { name: '', quantity: null, unit: null };
	}

	const match = cleaned.match(QTY_UNIT_NAME);
	if (match) {
		return {
			quantity: match[1],
			unit: match[2].toLowerCase(),
			name: match[3].trim()
		};
	}

	return { name: cleaned, quantity: null, unit: null };
}

/** Parse newline-separated ingredient lines (legacy import). */
export function parseIngredientLines(raw: string | null | undefined): RecipeIngredient[] {
	if (!raw) return [];

	return raw
		.split(/\r?\n/)
		.map(parseIngredientLine)
		.filter((item) => item.name.length > 0);
}

function normalizeIngredient(item: unknown): RecipeIngredient | null {
	if (typeof item !== 'object' || item === null) return null;

	const record = item as Partial<RecipeIngredient>;
	const name = String(record.name ?? '').trim();
	if (!name) return null;

	const quantityRaw = record.quantity;
	const unitRaw = record.unit;

	return {
		name,
		quantity:
			quantityRaw != null && String(quantityRaw).trim() ? String(quantityRaw).trim() : null,
		unit: unitRaw != null && String(unitRaw).trim() ? String(unitRaw).trim() : null
	};
}

/** Parse stored jsonb or form JSON into structured ingredients. */
export function parseIngredientsJson(raw: unknown): RecipeIngredient[] {
	if (raw == null) return [];

	if (typeof raw === 'string') {
		const trimmed = raw.trim();
		if (!trimmed) return [];

		try {
			return parseIngredientsJson(JSON.parse(trimmed));
		} catch {
			return parseIngredientLines(raw);
		}
	}

	if (Array.isArray(raw)) {
		return raw
			.map(normalizeIngredient)
			.filter((item): item is RecipeIngredient => item !== null);
	}

	return [];
}

/** Normalize form input for storage. */
export function normalizeIngredients(raw: string): RecipeIngredient[] {
	return parseIngredientsJson(raw);
}

/** Format quantity + unit for display. */
export function formatIngredientAmount(ingredient: RecipeIngredient): string | null {
	const parts: string[] = [];
	if (ingredient.quantity) parts.push(ingredient.quantity);
	if (ingredient.unit) parts.push(ingredient.unit);
	return parts.length > 0 ? parts.join(' ') : null;
}
