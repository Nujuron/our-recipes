<script lang="ts">
	type Props = {
		count?: number;
	};

	let { count = 6 }: Props = $props();
</script>

<div class="recipe-grid" aria-hidden="true">
	{#each Array.from({ length: count }, (_, index) => index) as index (index)}
		<div class="recipe-card skeleton-card" style={`animation-delay: ${index * 40}ms`}>
			<div class="recipe-card__cover skeleton-block"></div>
			<div class="recipe-card__body">
				<div class="skeleton-line skeleton-line--title"></div>
				<div class="skeleton-line"></div>
			</div>
		</div>
	{/each}
</div>
