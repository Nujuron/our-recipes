export const ALLERGENS = [
	'gluten',
	'crustaceans',
	'eggs',
	'fish',
	'peanuts',
	'soy',
	'milk',
	'nuts',
	'celery',
	'mustard',
	'sesame',
	'sulphites',
	'lupin',
	'molluscs'
] as const;

export type Allergen = (typeof ALLERGENS)[number];

const ALLERGEN_SET = new Set<string>(ALLERGENS);

export function isAllergen(value: unknown): value is Allergen {
	return typeof value === 'string' && ALLERGEN_SET.has(value);
}

function collectStrings(raw: unknown): string[] {
	if (raw == null || raw === '') return [];
	if (Array.isArray(raw)) {
		return raw.flatMap((item) => collectStrings(item));
	}
	if (typeof raw === 'string') {
		const trimmed = raw.trim();
		if (trimmed.startsWith('[')) {
			try {
				return collectStrings(JSON.parse(trimmed));
			} catch {
				return [trimmed];
			}
		}
		return [trimmed];
	}
	return [];
}

/** Keep valid values only, unique, in the canonical EU-14 order. */
export function parseAllergens(raw: unknown): Allergen[] {
	const seen = new Set<Allergen>();
	for (const value of collectStrings(raw)) {
		if (isAllergen(value)) seen.add(value);
	}
	return ALLERGENS.filter((allergen) => seen.has(allergen));
}

/** PostgREST array literal for `.not(column, 'ov', …)`. Values must already be safe. */
export function toPostgresArrayLiteral(values: readonly string[]): string {
	return `{${values.join(',')}}`;
}
