<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { localizeHref } from '$lib/paraglide/runtime';
	import type { loadPantrySummary } from '$lib/server/pantry';
	import { pantryToday } from '$lib/pantry';
	import * as m from '$lib/paraglide/messages';
	let { summary }: { summary: ReturnType<typeof loadPantrySummary> } = $props();
	onMount(() => {
		const refresh = async () => {
			const items = await summary;
			if (items?.some((item) => pantryToday(item.pantry.timezone) !== item.today))
				await invalidateAll();
		};
		const timer = setInterval(() => {
			void refresh().catch(() => {});
		}, 30_000);
		return () => clearInterval(timer);
	});
</script>

{#await summary then items}
	{#if items?.length}
		<aside class="panel stack" aria-label={m.pantry_title()}>
			<h2>{m.pantry_title()}</h2>
			{#each items as item (item.pantry.id)}<a
					href={resolve(localizeHref(`/pantry?pantry=${item.pantry.id}`) as Pathname)}
					>{item.pantry.name} · {m.pantry_due_count({ count: item.due })}</a
				>
				<p class="meta">{m.pantry_past_count({ count: item.past })}</p>{/each}
		</aside>
	{/if}
{/await}
