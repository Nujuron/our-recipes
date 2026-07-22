<script lang="ts">
	type Props = {
		label: string;
		fields?: number;
	};

	let { label, fields = 4 }: Props = $props();
</script>

<section class="stack" aria-busy="true">
	<div class="skeleton-line skeleton-line--title" style="max-width: 14rem;"></div>
	<p class="meta loading-label">{label}</p>
	<div class="panel form">
		{#each { length: fields } as _, index (index)}
			<div class="stack" style="gap: 0.4rem;">
				<div class="skeleton-line" style="max-width: 6rem; height: 0.7rem;"></div>
				<div class="skeleton-block" style="height: 2.5rem; border-radius: 0.5rem;"></div>
			</div>
		{/each}
		<div class="skeleton-block" style="height: 2.75rem; border-radius: 0.5rem;"></div>
	</div>
</section>
