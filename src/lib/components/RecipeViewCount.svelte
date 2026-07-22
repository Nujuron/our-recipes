<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';
	import { onMount } from 'svelte';

	type Props = {
		recipeId: string;
		initialCount: number | null;
	};

	type ViewResponse = {
		counted: boolean;
		viewCount: number;
	};

	let { recipeId, initialCount }: Props = $props();
	// svelte-ignore state_referenced_locally
	let count = $state(initialCount);

	function isViewResponse(value: unknown): value is ViewResponse {
		if (!value || typeof value !== 'object') return false;

		const result = value as Record<string, unknown>;
		return typeof result.counted === 'boolean' && typeof result.viewCount === 'number';
	}

	onMount(() => {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5_000);

		void (async () => {
			try {
				const endpoint = resolve(localizeHref(`/r/${recipeId}/view`) as Pathname);
				const response = await fetch(endpoint, {
					method: 'POST',
					signal: controller.signal
				});

				if (!response.ok) return;

				const result: unknown = await response.json();
				if (isViewResponse(result)) {
					count = result.viewCount;
				}
			} catch {
				// View recording is best-effort and must not disrupt recipe content.
			} finally {
				clearTimeout(timeoutId);
			}
		})();

		return () => {
			clearTimeout(timeoutId);
			controller.abort();
		};
	});
</script>

{#if count !== null}
	<p class="meta">{m.recipe_view_count({ count })}</p>
{/if}
