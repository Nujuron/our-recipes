import {
	formatIngredientAmount,
	formatScaledQuantity,
	parseIngredientLine,
	parseQuantityNumber,
	type RecipeIngredient
} from '$lib/ingredients';

export type ShoppingSource = {
	recipeId: string;
	recipeTitle: string;
};

export type ShoppingItem = {
	id: string;
	name: string;
	quantity: string | null;
	unit: string | null;
	checked: boolean;
	sources: ShoppingSource[];
	custom: boolean;
};

export const SHOPPING_LIST_STORAGE_KEY = 'our-recipes-shopping-list';

type IdFactory = () => string;

const defaultId: IdFactory = () => crypto.randomUUID();

/** Identity for merging: same ingredient name + unit, ignoring quantity. */
export function ingredientKey(name: string, unit: string | null): string {
	return `${name.trim().toLowerCase()}\0${(unit ?? '').trim().toLowerCase()}`;
}

export function itemKey(item: Pick<ShoppingItem, 'name' | 'unit'>): string {
	return ingredientKey(item.name, item.unit);
}

export function combineQuantities(left: string | null, right: string | null): string | null {
	if (!left) return right;
	if (!right) return left;

	const leftNumber = parseQuantityNumber(left);
	const rightNumber = parseQuantityNumber(right);
	if (leftNumber != null && rightNumber != null) {
		return formatScaledQuantity(leftNumber + rightNumber);
	}

	if (left === right) return left;
	return `${left} + ${right}`;
}

function mergeSources(
	existing: ShoppingSource[],
	incoming: ShoppingSource | null
): ShoppingSource[] {
	if (!incoming) return existing;
	if (existing.some((source) => source.recipeId === incoming.recipeId)) return existing;
	return [...existing, incoming];
}

function findIndexByKey(items: ShoppingItem[], key: string): number {
	return items.findIndex((item) => itemKey(item) === key);
}

export function hasIngredient(items: ShoppingItem[], ingredient: RecipeIngredient): boolean {
	const name = ingredient.name.trim();
	if (!name) return false;
	return findIndexByKey(items, ingredientKey(name, ingredient.unit)) >= 0;
}

export function hasAllIngredients(items: ShoppingItem[], ingredients: RecipeIngredient[]): boolean {
	const needed = ingredients.filter((ingredient) => ingredient.name.trim());
	if (needed.length === 0) return false;
	return needed.every((ingredient) => hasIngredient(items, ingredient));
}

export function addIngredientToList(
	items: ShoppingItem[],
	ingredient: RecipeIngredient,
	source: ShoppingSource | null = null,
	createId: IdFactory = defaultId
): ShoppingItem[] {
	const name = ingredient.name.trim();
	if (!name) return items;

	const unit = ingredient.unit;
	const key = ingredientKey(name, unit);
	const index = findIndexByKey(items, key);

	if (index < 0) {
		return [
			...items,
			{
				id: createId(),
				name,
				quantity: ingredient.quantity,
				unit,
				checked: false,
				sources: source ? [source] : [],
				custom: source == null
			}
		];
	}

	const current = items[index];
	if (!current) return items;

	const next = items.slice();
	next[index] = {
		...current,
		quantity: combineQuantities(current.quantity, ingredient.quantity),
		checked: false,
		sources: mergeSources(current.sources, source),
		custom: current.custom || source == null
	};
	return next;
}

export function removeIngredientFromList(
	items: ShoppingItem[],
	ingredient: RecipeIngredient
): ShoppingItem[] {
	const name = ingredient.name.trim();
	if (!name) return items;
	const key = ingredientKey(name, ingredient.unit);
	return items.filter((item) => itemKey(item) !== key);
}

export function toggleIngredientInList(
	items: ShoppingItem[],
	ingredient: RecipeIngredient,
	source: ShoppingSource | null = null,
	createId: IdFactory = defaultId
): ShoppingItem[] {
	if (hasIngredient(items, ingredient)) {
		return removeIngredientFromList(items, ingredient);
	}
	return addIngredientToList(items, ingredient, source, createId);
}

export function addMissingIngredients(
	items: ShoppingItem[],
	ingredients: RecipeIngredient[],
	source: ShoppingSource | null = null,
	createId: IdFactory = defaultId
): ShoppingItem[] {
	let next = items;
	for (const ingredient of ingredients) {
		if (!hasIngredient(next, ingredient)) {
			next = addIngredientToList(next, ingredient, source, createId);
		} else if (source) {
			const key = ingredientKey(ingredient.name, ingredient.unit);
			const index = findIndexByKey(next, key);
			const current = next[index];
			if (current && !current.sources.some((entry) => entry.recipeId === source.recipeId)) {
				const copy = next.slice();
				copy[index] = { ...current, sources: mergeSources(current.sources, source) };
				next = copy;
			}
		}
	}
	return next;
}

export function removeRecipeFromList(items: ShoppingItem[], recipeId: string): ShoppingItem[] {
	return items.flatMap((item) => {
		if (!item.sources.some((source) => source.recipeId === recipeId)) return [item];
		const remaining = item.sources.filter((source) => source.recipeId !== recipeId);
		if (remaining.length === 0 && !item.custom) return [];
		return [{ ...item, sources: remaining }];
	});
}

export function setItemChecked(
	items: ShoppingItem[],
	id: string,
	checked: boolean
): ShoppingItem[] {
	return items.map((item) => (item.id === id ? { ...item, checked } : item));
}

export function removeItem(items: ShoppingItem[], id: string): ShoppingItem[] {
	return items.filter((item) => item.id !== id);
}

export function clearCheckedItems(items: ShoppingItem[]): ShoppingItem[] {
	return items.filter((item) => !item.checked);
}

export function addCustomItem(
	items: ShoppingItem[],
	raw: string,
	createId: IdFactory = defaultId
): ShoppingItem[] {
	const ingredient = parseIngredientLine(raw);
	if (!ingredient.name) return items;
	return addIngredientToList(items, ingredient, null, createId);
}

export function formatShoppingItemAmount(item: ShoppingItem): string | null {
	return formatIngredientAmount(item);
}

function normalizeSource(value: unknown): ShoppingSource | null {
	if (typeof value !== 'object' || value === null) return null;
	const record = value as Partial<ShoppingSource>;
	const recipeId = String(record.recipeId ?? '').trim();
	const recipeTitle = String(record.recipeTitle ?? '').trim();
	if (!recipeId || !recipeTitle) return null;
	return { recipeId, recipeTitle };
}

function normalizeItem(value: unknown): ShoppingItem | null {
	if (typeof value !== 'object' || value === null) return null;
	const record = value as Partial<ShoppingItem>;
	const name = String(record.name ?? '').trim();
	if (!name) return null;

	const quantityRaw = record.quantity;
	const unitRaw = record.unit;
	const sources = Array.isArray(record.sources)
		? record.sources
				.map(normalizeSource)
				.filter((source): source is ShoppingSource => source !== null)
		: [];

	return {
		id: String(record.id ?? '').trim() || defaultId(),
		name,
		quantity: quantityRaw != null && String(quantityRaw).trim() ? String(quantityRaw).trim() : null,
		unit: unitRaw != null && String(unitRaw).trim() ? String(unitRaw).trim() : null,
		checked: Boolean(record.checked),
		sources,
		custom: Boolean(record.custom)
	};
}

export function parseStoredShoppingList(raw: unknown): ShoppingItem[] {
	if (raw == null) return [];

	if (typeof raw === 'string') {
		const trimmed = raw.trim();
		if (!trimmed) return [];
		try {
			return parseStoredShoppingList(JSON.parse(trimmed));
		} catch {
			return [];
		}
	}

	if (!Array.isArray(raw)) return [];
	return raw.map(normalizeItem).filter((item): item is ShoppingItem => item !== null);
}

export function loadShoppingList(): ShoppingItem[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		return parseStoredShoppingList(localStorage.getItem(SHOPPING_LIST_STORAGE_KEY));
	} catch {
		return [];
	}
}

export function saveShoppingList(items: ShoppingItem[]): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(SHOPPING_LIST_STORAGE_KEY, JSON.stringify(items));
}
