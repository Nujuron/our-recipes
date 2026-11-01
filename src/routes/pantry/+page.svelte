<script lang="ts">
	import MeTabs from '$lib/components/MeTabs.svelte';
	import PantryDashboard from '$lib/components/PantryDashboard.svelte';
	import * as m from '$lib/paraglide/messages';
	let { data, form } = $props();
</script>

<svelte:head><title>{m.pantry_title()} · {m.brand_name()}</title></svelte:head>
<section class="stack">
	<h1>{m.pantry_title()}</h1>
	<p class="meta">{m.pantry_subtitle()}</p>
	<MeTabs />
	{#await data.inventory}
		<div class="panel stack" aria-busy="true">
			<div class="skeleton-line"></div>
			<div class="skeleton-line"></div>
			<div class="skeleton-line"></div>
		</div>
	{:then inventory}
		<PantryDashboard {inventory} {form} initialDateFilter={data.dateFilter} />
	{:catch}
		<p class="alert">{m.pantry_load_error()}</p>
	{/await}
</section>
