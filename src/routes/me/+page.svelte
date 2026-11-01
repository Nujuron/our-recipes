<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import MeTabs from '$lib/components/MeTabs.svelte';
	import PantrySummary from '$lib/components/PantrySummary.svelte';
	import RecipeGridSkeleton from '$lib/components/RecipeGridSkeleton.svelte';
	import AllergenBadges from '$lib/components/AllergenBadges.svelte';
	import ClassificationBadges from '$lib/components/ClassificationBadges.svelte';
	import RecipeBrowseFilters from '$lib/components/RecipeBrowseFilters.svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';

	let { data } = $props();
</script>

<section class="stack">
	<div class="form-row" style="justify-content: space-between;">
		<h1>{m.me_title()}</h1>
		<a class="btn btn-primary" href={resolve(localizeHref('/recipes/new') as Pathname)}>
			{m.nav_new_recipe()}
		</a>
	</div>

	<MeTabs />
	<PantrySummary summary={data.pantrySummary} />

	<form class="recipe-filters-bar" method="GET">
		<RecipeBrowseFilters
			course={data.course}
			effort={data.effort}
			excludeAllergens={data.excludeAllergens}
		/>
		<button class="btn btn-ghost" type="submit">{m.search_button()}</button>
	</form>

	{#await data.recipes}
		<p class="meta loading-label">{m.loading_recipes()}</p>
		<RecipeGridSkeleton count={4} />
	{:then result}
		{#if result.error}
			<p class="alert">{result.error}</p>
		{/if}

		{#if result.items.length === 0}
			<p class="empty">
				{data.course || data.effort || data.excludeAllergens.length
					? m.me_empty_filtered()
					: m.me_empty()}
			</p>
		{:else}
			<div class="recipe-grid">
				{#each result.items as recipe (recipe.id)}
					<a
						class="recipe-card"
						href={resolve(localizeHref(`/recipes/${recipe.id}/edit`) as Pathname)}
					>
						{#if recipe.coverUrl}
							<img class="recipe-card__cover" src={recipe.coverUrl} alt="" />
						{:else}
							<div class="recipe-card__cover" aria-hidden="true"></div>
						{/if}
						<div class="recipe-card__body">
							<h2>{recipe.title}</h2>
							<p>{recipe.is_public ? m.me_public() : m.me_draft()} · {m.me_edit()}</p>
							<ClassificationBadges course={recipe.course} effort={recipe.effort} />
							<AllergenBadges allergens={recipe.allergens ?? []} compact />
						</div>
					</a>
				{/each}
			</div>
		{/if}
	{:catch err}
		<p class="alert">{err instanceof Error ? err.message : m.error_generic()}</p>
	{/await}
</section>
