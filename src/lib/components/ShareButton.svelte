<script lang="ts">
	import { page } from '$app/state';
	import { onDestroy } from 'svelte';
	import * as m from '$lib/paraglide/messages';

	type Props = {
		title: string;
		text?: string | null;
		url?: string;
	};

	let { title, text = null, url }: Props = $props();

	let status = $state<'idle' | 'copied' | 'error'>('idle');
	let resetTimer: ReturnType<typeof setTimeout> | null = null;

	const shareUrl = $derived(url ?? page.url.href);

	function scheduleReset() {
		if (resetTimer) clearTimeout(resetTimer);
		resetTimer = setTimeout(() => {
			status = 'idle';
			resetTimer = null;
		}, 2000);
	}

	async function share() {
		const payload = {
			title,
			text: text?.trim() || title,
			url: shareUrl
		};

		try {
			if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
				await navigator.share(payload);
				return;
			}

			await navigator.clipboard.writeText(shareUrl);
			status = 'copied';
			scheduleReset();
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				return;
			}

			try {
				await navigator.clipboard.writeText(shareUrl);
				status = 'copied';
				scheduleReset();
			} catch {
				status = 'error';
				scheduleReset();
			}
		}
	}

	onDestroy(() => {
		if (resetTimer) clearTimeout(resetTimer);
	});
</script>

<button
	class="btn btn-ghost"
	type="button"
	onclick={share}
	aria-live="polite"
>
	{#if status === 'copied'}
		{m.share_copied()}
	{:else if status === 'error'}
		{m.share_failed()}
	{:else}
		{m.share_recipe()}
	{/if}
</button>
