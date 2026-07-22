<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages';
	import { resolveTheme, toggleTheme, type Theme } from '$lib/theme';

	let theme = $state<Theme>('light');

	onMount(() => {
		const fromDom = document.documentElement.dataset.theme;
		theme = fromDom === 'dark' || fromDom === 'light' ? fromDom : resolveTheme();
	});

	function onToggle() {
		theme = toggleTheme(theme);
	}
</script>

<button
	type="button"
	class="theme-toggle"
	onclick={onToggle}
	aria-label={theme === 'dark' ? m.theme_to_light() : m.theme_to_dark()}
	title={theme === 'dark' ? m.theme_to_light() : m.theme_to_dark()}
>
	{#if theme === 'dark'}
		<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8" />
			<path
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56"
			/>
		</svg>
	{:else}
		<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M21 14.3A8.5 8.5 0 0 1 9.7 3 7 7 0 1 0 21 14.3Z"
			/>
		</svg>
	{/if}
</button>
