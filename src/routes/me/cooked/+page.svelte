<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import MeTabs from '$lib/components/MeTabs.svelte';
	import RecipeGridSkeleton from '$lib/components/RecipeGridSkeleton.svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';

	let { data } = $props();
</script>

<section class="stack">
	<div>
		<h1>{m.cooked_list_title()}</h1>
		<p class="meta">{m.cooked_list_subtitle()}</p>
	</div>

	<MeTabs />

	{#await data.recipes}
		<p class="meta loading-label">{m.loading_recipes()}</p>
		<RecipeGridSkeleton count={4} />
	{:then result}
		{#if result.error}
			<p class="alert">{result.error}</p>
		{/if}

		{#if result.items.length === 0}
			<p class="empty">{m.cooked_list_empty()}</p>
		{:else}
			<div class="recipe-grid">
				{#each result.items as recipe (recipe.id)}
					<a
						class="recipe-card"
						href={resolve(localizeHref(`/r/${recipe.id}`) as Pathname)}
					>
						{#if recipe.coverUrl}
							<img class="recipe-card__cover" src={recipe.coverUrl} alt="" />
						{:else}
							<div class="recipe-card__cover" aria-hidden="true"></div>
						{/if}
						<div class="recipe-card__body">
							<h2>{recipe.title}</h2>
							{#if recipe.authorName}
								<p>{m.by_author({ name: recipe.authorName })}</p>
							{/if}
							<p class="meta rating-card-meta">
								{m.cooked_list_score({ score: recipe.myScore })}
							</p>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	{:catch err}
		<p class="alert">{err instanceof Error ? err.message : m.error_generic()}</p>
	{/await}
</section>
