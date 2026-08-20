export type RecipeIngredient = {
	name: string;
	quantity: string | null;
	unit: string | null;
};

const BULLET_PREFIX = /^[-*•]\s+/;
const QTY_UNIT_NAME = /^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s+([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ.]+)\s+(.+)$/u;

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
		quantity: quantityRaw != null && String(quantityRaw).trim() ? String(quantityRaw).trim() : null,
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
		return raw.map(normalizeIngredient).filter((item): item is RecipeIngredient => item !== null);
	}

	return [];
}

/** Normalize form input for storage. */
export function normalizeIngredients(raw: string): RecipeIngredient[] {
	return parseIngredientsJson(raw);
}

export const SERVINGS_MIN = 1;
export const SERVINGS_MAX = 99;
export const DEFAULT_SERVINGS = 4;

/** Parse a servings field from form input. */
export function parseServings(raw: unknown): number | null {
	const value = Number.parseInt(String(raw ?? ''), 10);
	if (!Number.isInteger(value) || value < SERVINGS_MIN || value > SERVINGS_MAX) {
		return null;
	}
	return value;
}

const MIXED_FRACTION = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/;
const SIMPLE_FRACTION = /^(\d+)\s*\/\s*(\d+)$/;
const DECIMAL = /^\d+(?:[.,]\d+)?$/;

/** Parse a quantity string into a number, or null if it is not numeric. */
export function parseQuantityNumber(raw: string): number | null {
	const cleaned = raw.trim();
	if (!cleaned) return null;

	const mixed = cleaned.match(MIXED_FRACTION);
	if (mixed) {
		const whole = Number(mixed[1]);
		const numerator = Number(mixed[2]);
		const denominator = Number(mixed[3]);
		if (denominator === 0) return null;
		return whole + numerator / denominator;
	}

	const fraction = cleaned.match(SIMPLE_FRACTION);
	if (fraction) {
		const numerator = Number(fraction[1]);
		const denominator = Number(fraction[2]);
		if (denominator === 0) return null;
		return numerator / denominator;
	}

	if (!DECIMAL.test(cleaned)) return null;

	const value = Number(cleaned.replace(',', '.'));
	return Number.isFinite(value) ? value : null;
}

/** Format a scaled quantity for display. */
export function formatScaledQuantity(value: number): string {
	const rounded = Math.round(value * 100) / 100;
	if (Object.is(rounded, -0) || rounded === 0) return '0';
	return String(rounded);
}

/** Scale a stored quantity string by a factor. Non-numeric values are left unchanged. */
export function scaleQuantity(quantity: string | null, factor: number): string | null {
	if (quantity == null) return null;
	if (factor === 1) return quantity;

	const parsed = parseQuantityNumber(quantity);
	if (parsed == null) return quantity;

	return formatScaledQuantity(parsed * factor);
}

/** True when a stored quantity can drive proportional scaling. */
export function isScalableQuantity(quantity: string | null): boolean {
	const parsed = parseQuantityNumber(quantity ?? '');
	return parsed != null && parsed > 0;
}

/** Factor that turns `originalQuantity` into `nextQuantity`, or null if either is not scalable. */
export function scaleFactorFromQuantity(
	originalQuantity: string | null,
	nextQuantity: string
): number | null {
	const original = parseQuantityNumber(originalQuantity ?? '');
	const next = parseQuantityNumber(nextQuantity);
	if (original == null || original <= 0 || next == null || next <= 0) return null;
	return next / original;
}

/** Next people count from the cooking-mode +/- stepper. */
export function stepCookFor(current: number, delta: -1 | 1): number {
	if (delta < 0) {
		return Math.max(SERVINGS_MIN, Math.ceil(current - 1e-9) - 1);
	}
	return Math.min(SERVINGS_MAX, Math.floor(current + 1e-9) + 1);
}

/** Format people count for cooking-mode display (integer or one decimal). */
export function formatCookFor(value: number): string {
	const rounded = Math.round(value * 10) / 10;
	if (!Number.isFinite(rounded) || rounded <= 0) return String(SERVINGS_MIN);
	if (Number.isInteger(rounded)) return String(rounded);
	return String(rounded);
}

/** Format quantity + unit for display. */
export function formatIngredientAmount(ingredient: RecipeIngredient): string | null {
	const parts: string[] = [];
	if (ingredient.quantity) parts.push(ingredient.quantity);
	if (ingredient.unit) parts.push(ingredient.unit);
	return parts.length > 0 ? parts.join(' ') : null;
}
