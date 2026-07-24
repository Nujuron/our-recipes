export type CookingSessionState = {
	checkedIndices: number[];
	currentStepIndex: number;
	completedStepIndices: number[];
};

const STORAGE_PREFIX = 'cooking:';

function storageKey(recipeId: string): string {
	return `${STORAGE_PREFIX}${recipeId}`;
}

export function loadCookingState(recipeId: string): CookingSessionState | null {
	if (typeof sessionStorage === 'undefined') return null;

	try {
		const raw = sessionStorage.getItem(storageKey(recipeId));
		if (!raw) return null;

		const parsed = JSON.parse(raw) as Partial<CookingSessionState>;
		if (!parsed || typeof parsed !== 'object') return null;

		return {
			checkedIndices: Array.isArray(parsed.checkedIndices)
				? parsed.checkedIndices.filter((value) => Number.isInteger(value))
				: [],
			currentStepIndex:
				typeof parsed.currentStepIndex === 'number' ? parsed.currentStepIndex : 0,
			completedStepIndices: Array.isArray(parsed.completedStepIndices)
				? parsed.completedStepIndices.filter((value) => Number.isInteger(value))
				: []
		};
	} catch {
		return null;
	}
}

export function saveCookingState(recipeId: string, state: CookingSessionState): void {
	if (typeof sessionStorage === 'undefined') return;
	sessionStorage.setItem(storageKey(recipeId), JSON.stringify(state));
}

export function clearCookingState(recipeId: string): void {
	if (typeof sessionStorage === 'undefined') return;
	sessionStorage.removeItem(storageKey(recipeId));
}
