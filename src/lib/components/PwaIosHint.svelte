<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { getPwaInstall } from '$lib/pwaInstall.svelte';

	const install = getPwaInstall();
</script>

{#if install.showIosHint}
	<div class="pwa-ios-hint" role="status">
		<p>{m.pwa_ios_hint()}</p>
		<button type="button" class="pwa-ios-hint__dismiss" onclick={() => install.dismissIosHint()}>
			{m.pwa_ios_hint_dismiss()}
		</button>
	</div>
{/if}
