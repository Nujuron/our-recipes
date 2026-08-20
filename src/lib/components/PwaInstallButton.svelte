<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { getPwaInstall } from '$lib/pwaInstall.svelte';

	const install = getPwaInstall();
</script>

{#if install.canPrompt && !install.isStandalone}
	<button
		type="button"
		class="theme-toggle"
		onclick={() => void install.promptInstall()}
		aria-label={m.pwa_install()}
		title={m.pwa_install()}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<path
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M12 4v10m0 0 3.5-3.5M12 14 8.5 10.5M5 16.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5"
			/>
		</svg>
	</button>
{/if}
