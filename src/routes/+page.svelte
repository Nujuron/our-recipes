<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import RecipeGridSkeleton from '$lib/components/RecipeGridSkeleton.svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';

	let { data } = $props();
</script>

<section class="hero">
	<h1>{m.hero_title()}</h1>
	<p>{m.hero_subtitle()}</p>
	<div class="hero__actions">
		<a class="btn btn-primary" href="#recipes">{m.hero_cta_browse()}</a>
		{#if data.user}
			<a class="btn btn-ghost" href={resolve(localizeHref('/recipes/new') as Pathname)}>
				{m.hero_cta_create()}
			</a>
		{:else}
			<a class="btn btn-ghost" href={resolve(localizeHref('/login') as Pathname)}>
				{m.hero_cta_create()}
			</a>
		{/if}
	</div>
</section>

<section id="recipes">
	<form class="search-bar" method="GET">
		<input
			type="search"
			name="q"
			value={data.q}
			placeholder={m.search_placeholder()}
			aria-label={m.search_placeholder()}
		/>
		<button class="btn btn-primary" type="submit">{m.search_button()}</button>
	</form>

	{#await data.recipes}
		<p class="meta loading-label">{m.loading_recipes()}</p>
		<RecipeGridSkeleton />
	{:then result}
		{#if result.error}
			<p class="alert">{result.error}</p>
		{/if}

		{#if result.items.length === 0}
			<p class="empty">{m.empty_public()}</p>
		{:else}
			<div class="recipe-grid">
				{#each result.items as recipe, index (recipe.id)}
					<a
						class="recipe-card"
						href={resolve(localizeHref(`/r/${recipe.id}`) as Pathname)}
						style={`animation-delay: ${Math.min(index, 8) * 40}ms`}
					>
						{#if recipe.coverUrl}
							<img class="recipe-card__cover" src={recipe.coverUrl} alt="" />
						{:else}
							<div class="recipe-card__cover" aria-hidden="true"></div>
						{/if}
						<div class="recipe-card__body">
							<h2>{recipe.title}</h2>
							{#if recipe.summary}
								<p>{recipe.summary}</p>
							{:else if recipe.authorName}
								<p>{m.by_author({ name: recipe.authorName })}</p>
							{/if}
							{#if recipe.ratingCount && recipe.ratingCount > 0 && recipe.ratingAverage != null}
								<p class="meta rating-card-meta">
									{m.rating_card_summary({
										average: recipe.ratingAverage.toFixed(1),
										count: recipe.ratingCount
									})}
								</p>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{/if}
	{:catch err}
		<p class="alert">{err instanceof Error ? err.message : m.error_generic()}</p>
	{/await}
</section>
