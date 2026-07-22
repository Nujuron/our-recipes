<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import ShareButton from '$lib/components/ShareButton.svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';

	let { data } = $props();

	let pageTitle = $state<string>(m.brand_name());
	let pageDescription = $state<string | null>(null);

	$effect(() => {
		let cancelled = false;
		pageTitle = m.brand_name();
		pageDescription = null;

		data.recipe
			.then((recipe) => {
				if (cancelled) return;
				pageTitle = `${recipe.title} · ${m.brand_name()}`;
				pageDescription = recipe.summary;
			})
			.catch(() => {
				if (cancelled) return;
				pageTitle = m.brand_name();
				pageDescription = null;
			});

		return () => {
			cancelled = true;
		};
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
	{#if pageDescription}
		<meta name="description" content={pageDescription} />
	{/if}
</svelte:head>

{#await data.recipe}
	<article class="stack" aria-busy="true">
		<header class="recipe-hero">
			<div class="recipe-hero__cover skeleton-block"></div>
			<div class="stack">
				<div class="skeleton-line skeleton-line--title" style="max-width: 18rem;"></div>
				<div class="skeleton-line" style="max-width: 28rem;"></div>
				<p class="meta loading-label">{m.loading_recipe()}</p>
			</div>
		</header>
		<div class="panel">
			<div class="skeleton-line"></div>
			<div class="skeleton-line"></div>
			<div class="skeleton-line" style="max-width: 70%;"></div>
		</div>
	</article>
{:then recipe}
	<article class="stack">
		<header class="recipe-hero">
			{#if recipe.coverUrl}
				<img class="recipe-hero__cover" src={recipe.coverUrl} alt="" />
			{/if}
			<div class="stack">
				<h1>{recipe.title}</h1>
				{#if recipe.summary}
					<p>{recipe.summary}</p>
				{/if}
				{#if recipe.authorName}
					<p class="meta">{m.by_author({ name: recipe.authorName })}</p>
				{/if}
				{#if recipe.isPublic || recipe.canEdit}
					<div class="recipe-hero__actions">
						{#if recipe.isPublic}
							<ShareButton title={recipe.title} text={recipe.summary} />
						{/if}
						{#if recipe.canEdit}
							<a
								class="btn btn-ghost"
								href={resolve(localizeHref(`/recipes/${recipe.id}/edit`) as Pathname)}
							>
								{m.me_edit()}
							</a>
						{/if}
					</div>
				{/if}
			</div>
		</header>

		{#if recipe.ingredients.length > 0}
			<section class="panel recipe-ingredients">
				<h2>{m.ingredients_heading()}</h2>
				<ul>
					{#each recipe.ingredients as item, index (index)}
						<li>{item}</li>
					{/each}
				</ul>
			</section>
		{/if}

		<div class="panel markdown-body">
			{@html recipe.html}
		</div>
	</article>
{:catch}
	<p class="alert">{m.error_not_found()}</p>
{/await}
