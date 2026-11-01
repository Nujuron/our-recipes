import { createContext } from 'svelte';
import { importedShoppingItems, type ImportLine } from '$lib/pantryImport';
import type { RecipeIngredient } from '$lib/ingredients';
import {
	addCustomItem,
	addMissingIngredients,
	clearCheckedItems,
	hasAllIngredients,
	hasIngredient,
	loadShoppingList,
	removeItem,
	removeRecipeFromList,
	saveShoppingList,
	setItemChecked,
	toggleIngredientInList,
	type ShoppingItem,
	type ShoppingSource
} from '$lib/shoppingList';

export class ShoppingCart {
	items = $state<ShoppingItem[]>([]);
	ready = $state(false);

	hydrate() {
		this.items = loadShoppingList();
		this.ready = true;
	}

	private commit(next: ShoppingItem[]) {
		this.items = next;
		saveShoppingList(next);
	}

	get uncheckedCount() {
		return this.items.filter((item) => !item.checked).length;
	}

	hasIngredient(ingredient: RecipeIngredient) {
		return hasIngredient(this.items, ingredient);
	}

	hasAllIngredients(ingredients: RecipeIngredient[]) {
		return hasAllIngredients(this.items, ingredients);
	}

	toggleIngredient(ingredient: RecipeIngredient, source: ShoppingSource) {
		this.commit(toggleIngredientInList(this.items, ingredient, source));
	}

	addMissingFromRecipe(ingredients: RecipeIngredient[], source: ShoppingSource) {
		this.commit(addMissingIngredients(this.items, ingredients, source));
	}

	removeRecipe(recipeId: string) {
		this.commit(removeRecipeFromList(this.items, recipeId));
	}

	setChecked(id: string, checked: boolean) {
		this.commit(setItemChecked(this.items, id, checked));
	}

	remove(id: string) {
		this.commit(removeItem(this.items, id));
	}

	clearChecked() {
		this.commit(clearCheckedItems(this.items));
	}

	acceptPantryImport(lines: ImportLine[], savedLineIds: string[]) {
		const next = importedShoppingItems(this.items, lines, savedLineIds);
		// This write must throw on failure so the caller keeps its retry receipt.
		saveShoppingList(next);
		this.items = next;
	}

	clearAll() {
		this.commit([]);
	}

	addCustom(raw: string) {
		this.commit(addCustomItem(this.items, raw));
	}
}

export const [getShoppingCart, setShoppingCart] = createContext<ShoppingCart>();
