<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { pantryToday } from '$lib/pantry';
	import { pantryDateTypeLabel } from '$lib/pantryLabels';
	import { getShoppingCart } from '$lib/shoppingList.svelte';
	import { parseIngredientsJson } from '$lib/ingredients';
	import RecipeBrowseFilters from '$lib/components/RecipeBrowseFilters.svelte';
	import AllergenBadges from '$lib/components/AllergenBadges.svelte';
	import ClassificationBadges from '$lib/components/ClassificationBadges.svelte';
	import * as m from '$lib/paraglide/messages';
	let { data } = $props();
	const cart = getShoppingCart();
	const href = (path: string) => resolve(localizeHref(path) as Pathname);
	// Re-evaluate suggestions after crossing a calendar day in the selected pantry.
	onMount(() => {
		const refresh = async () => {
			const result = await data.suggestions;
			if (result && pantryToday(result.pantry.timezone) !== result.today) await invalidateAll();
		};
		const timer = setInterval(() => {
			void refresh();
		}, 30_000);
		return () => clearInterval(timer);
	});
</script>

<svelte:head><title>{m.pantry_recipes_title()} · {m.brand_name()}</title></svelte:head>
<section class="stack">
	<h1>{m.pantry_recipes_title()}</h1>
	{#if data.ingredient}<p>{data.ingredient}</p>{/if}
	<a href={href(`/pantry?pantry=${data.pantryId ?? ''}`)}>{m.pantry_title()}</a>
	<p class="meta">{m.pantry_matching_hint()}</p>
	<form method="GET" class="recipe-filters-bar">
		<input type="hidden" name="pantry" value={data.pantryId ?? ''} /><input
			type="hidden"
			name="ingredient"
			value={data.ingredient}
		/><RecipeBrowseFilters
			course={data.course}
			effort={data.effort}
			excludeAllergens={data.excludeAllergens}
		/><button class="btn btn-ghost">{m.search_button()}</button>
	</form>
	{#await data.suggestions}
		<div class="panel stack" aria-busy="true">
			<div class="skeleton-line"></div>
			<div class="skeleton-line"></div>
		</div>
	{:then result}
		{#if !result}<p class="alert">{m.pantry_load_error()}</p>
		{:else}
			{#each result.items as item (item.recipe.id)}
				<article class="panel stack">
					<h2><a href={href(`/r/${item.recipe.id}`)}>{item.recipe.title}</a></h2>
					<ClassificationBadges
						course={item.recipe.course}
						effort={item.recipe.effort}
					/><AllergenBadges allergens={item.recipe.allergens} compact />
					{#each item.due as lot (lot.id)}<p>
							{m.pantry_recipe_uses({ name: lot.name })} · {pantryDateTypeLabel(lot.date_type)}: {lot.food_date}
						</p>{/each}
					<p>
						<strong>{m.pantry_matches()}:</strong>
						{item.matches.map((lot) => lot.name).join(', ') || '—'}
					</p>
					<p><strong>{m.pantry_missing()}:</strong> {item.missing.join(', ') || '—'}</p>
					{#if item.missing.length > 0}<button
							class="btn btn-ghost"
							type="button"
							disabled={!cart.ready}
							onclick={() =>
								cart.addMissingFromRecipe(
									parseIngredientsJson(item.recipe.ingredients).filter((ingredient) =>
										item.missing.includes(ingredient.name)
									),
									{ recipeId: item.recipe.id, recipeTitle: item.recipe.title }
								)}>{m.pantry_buy_missing()}</button
						>{/if}
				</article>
			{:else}<p class="empty">{m.pantry_no_recipes()}</p>{/each}
		{/if}
	{:catch}<p class="alert">{m.error_generic()}</p>{/await}
</section>
