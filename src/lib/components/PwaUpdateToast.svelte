<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages';

	let needRefresh = $state(false);
	let updateSW = $state<(reloadPage?: boolean) => Promise<void>>(() => Promise.resolve());

	onMount(() => {
		let cancelled = false;
		let intervalId: ReturnType<typeof setInterval> | undefined;
		let onVisible: (() => void) | undefined;

		void import('virtual:pwa-register').then(({ registerSW }) => {
			if (cancelled) return;

			updateSW = registerSW({
				immediate: true,
				onNeedRefresh() {
					needRefresh = true;
				},
				onRegisteredSW(_url, registration) {
					if (!registration) return;

					const ping = () => {
						if (registration.installing || !navigator.onLine) return;
						void registration.update();
					};

					intervalId = setInterval(ping, 60 * 60 * 1000);
					onVisible = () => {
						if (document.visibilityState === 'visible') ping();
					};
					document.addEventListener('visibilitychange', onVisible);
				}
			});
		});

		return () => {
			cancelled = true;
			if (intervalId) clearInterval(intervalId);
			if (onVisible) document.removeEventListener('visibilitychange', onVisible);
		};
	});

	function reload() {
		void updateSW(true);
	}

	function dismiss() {
		needRefresh = false;
	}
</script>

{#if needRefresh}
	<div class="pwa-toast" role="status">
		<p>{m.pwa_update_available()}</p>
		<div class="pwa-toast__actions">
			<button class="btn btn-ghost" type="button" onclick={dismiss}>{m.pwa_update_dismiss()}</button
			>
			<button class="btn btn-primary" type="button" onclick={reload}>{m.pwa_update_reload()}</button
			>
		</div>
	</div>
{/if}
