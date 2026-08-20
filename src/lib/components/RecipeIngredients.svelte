<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { formatIngredientAmount, type RecipeIngredient } from '$lib/ingredients';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';
	import { hasAllIngredients, hasIngredient } from '$lib/shoppingList';
	import { getShoppingCart } from '$lib/shoppingList.svelte';

	type Props = {
		recipeId: string;
		recipeTitle: string;
		servings: number;
		ingredients: RecipeIngredient[];
	};

	let { recipeId, recipeTitle, servings, ingredients }: Props = $props();

	const cart = getShoppingCart();
	const source = $derived({ recipeId, recipeTitle });
	const allInList = $derived(hasAllIngredients(cart.items, ingredients));

	function toggle(ingredient: RecipeIngredient) {
		cart.toggleIngredient(ingredient, source);
	}

	function addOrRemoveRecipe() {
		if (allInList) {
			cart.removeRecipe(recipeId);
			return;
		}
		cart.addMissingFromRecipe(ingredients, source);
	}
</script>

<section class="panel recipe-ingredients">
	<div class="recipe-ingredients__head">
		<h2>{m.ingredients_heading()}</h2>
		<p class="meta">{m.recipe_serves({ count: servings })}</p>
	</div>

	<div class="recipe-ingredients__cart">
		<button class="btn btn-ghost" type="button" onclick={addOrRemoveRecipe}>
			{allInList ? m.shopping_remove_recipe() : m.shopping_add_recipe()}
		</button>
		{#if allInList}
			<a
				class="meta recipe-ingredients__cart-link"
				href={resolve(localizeHref('/shopping') as Pathname)}
			>
				{m.shopping_in_list()}
			</a>
		{/if}
	</div>

	<ul>
		{#each ingredients as item, index (index)}
			{@const amount = formatIngredientAmount(item)}
			{@const inCart = hasIngredient(cart.items, item)}
			<li>
				<button
					type="button"
					class="recipe-ingredient"
					class:is-in-cart={inCart}
					aria-pressed={inCart}
					aria-label={inCart
						? m.shopping_toggle_remove({ name: item.name })
						: m.shopping_toggle_add({ name: item.name })}
					onclick={() => toggle(item)}
				>
					<span class="recipe-ingredient__mark" aria-hidden="true"></span>
					<span class="recipe-ingredient__name">{item.name}</span>
					{#if amount}
						<span class="meta recipe-ingredients__amount">{amount}</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
</section>
