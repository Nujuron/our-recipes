import type { LotInput } from '$lib/pantry';
import type { ShoppingItem } from '$lib/shoppingList';
export type ImportLot = LotInput & { id: string };
export type ImportLine = { lineId: string; snapshot: string; lots: ImportLot[] };
export type PantryImport = {
	userId: string;
	operationId: string;
	pantryId: string;
	lines: ImportLine[];
};

export function shoppingSnapshot(item: ShoppingItem): string {
	return JSON.stringify([item.id, item.name, item.quantity, item.unit, item.checked]);
}

export function importedShoppingItems(
	items: ShoppingItem[],
	lines: ImportLine[],
	savedLineIds: string[]
): ShoppingItem[] {
	const saved = new Set(savedLineIds);
	const snapshots = new Map(
		lines.filter((line) => saved.has(line.lineId)).map((line) => [line.lineId, line.snapshot])
	);
	return items.filter((item) => !item.checked || snapshots.get(item.id) !== shoppingSnapshot(item));
}

export const pantryImportStorageKey = (userId: string) => `our-recipes-pantry-import:${userId}`;

/** Refuse to send an import unless its durable retry record has been written successfully. */
export function persistPantryImport(
	storage: Pick<Storage, 'setItem'>,
	draft: PantryImport
): boolean {
	try {
		storage.setItem(pantryImportStorageKey(draft.userId), JSON.stringify(draft));
		return true;
	} catch {
		return false;
	}
}
