export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'our-recipes-theme';
export const THEME_COLOR_LIGHT = '#f3f0e8';
export const THEME_COLOR_DARK = '#141a17';

export function getSystemTheme(): Theme {
	if (typeof window === 'undefined') return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function readStoredTheme(): Theme | null {
	if (typeof window === 'undefined') return null;
	const stored = localStorage.getItem(THEME_STORAGE_KEY);
	return stored === 'light' || stored === 'dark' ? stored : null;
}

export function resolveTheme(stored: Theme | null = readStoredTheme()): Theme {
	return stored ?? getSystemTheme();
}

export function themeColor(theme: Theme): string {
	return theme === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
}

export function applyThemeColor(theme: Theme): void {
	if (typeof document === 'undefined') return;
	const meta = document.querySelector('meta[name="theme-color"]');
	if (meta) meta.setAttribute('content', themeColor(theme));
}

export function applyTheme(theme: Theme): void {
	if (typeof document === 'undefined') return;
	document.documentElement.dataset.theme = theme;
	document.documentElement.style.colorScheme = theme;
	applyThemeColor(theme);
}

export function persistTheme(theme: Theme): void {
	localStorage.setItem(THEME_STORAGE_KEY, theme);
	applyTheme(theme);
}

export function toggleTheme(current: Theme): Theme {
	const next: Theme = current === 'dark' ? 'light' : 'dark';
	persistTheme(next);
	return next;
}
