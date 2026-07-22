<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import DuplicateButton from '$lib/components/DuplicateButton.svelte';
	import RecipeRating from '$lib/components/RecipeRating.svelte';
	import ShareButton from '$lib/components/ShareButton.svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';

	let { data, form } = $props();

	let pageTitle = $state<string>(m.brand_name());
	let pageDescription = $state<string | null>(null);

	let imageDialog: HTMLDialogElement | undefined = $state();
	let lightboxSrc = $state('');
	let lightboxAlt = $state('');

	const duplicateError = $derived.by(() => {
		if (form?.form !== 'duplicate' || !form.error) return null;
		switch (form.error) {
			case 'auth':
				return m.error_auth_required();
			case 'not_found':
				return m.error_not_found();
			case 'forbidden':
				return m.error_forbidden();
			default:
				return m.error_generic();
		}
	});

	const openLightbox = (src: string, alt = '') => {
		lightboxSrc = src;
		lightboxAlt = alt;
		imageDialog?.showModal();
	};

	const closeLightbox = () => {
		imageDialog?.close();
	};

	const onLightboxClick = (event: MouseEvent) => {
		if (event.target === imageDialog) {
			closeLightbox();
		}
	};

	const markdownLightbox = (node: HTMLElement) => {
		const onClick = (event: MouseEvent) => {
			const target = event.target;
			if (!(target instanceof HTMLImageElement)) return;
			openLightbox(target.currentSrc || target.src, target.alt);
		};
		node.addEventListener('click', onClick);
		return {
			destroy() {
				node.removeEventListener('click', onClick);
			}
		};
	};

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
		<div class="panel">
			<div class="skeleton-line" style="max-width: 8rem;"></div>
			<div class="skeleton-line" style="max-width: 14rem;"></div>
		</div>
	</article>
{:then recipe}
	<article class="stack">
		<header class="recipe-hero">
			{#if recipe.coverUrl}
				{@const coverUrl = recipe.coverUrl}
				<button
					type="button"
					class="recipe-hero__cover-btn"
					aria-label={m.image_view_larger()}
					onclick={() => openLightbox(coverUrl)}
				>
					<img class="recipe-hero__cover" src={coverUrl} alt="" />
				</button>
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
							{#if recipe.isSignedIn}
								<DuplicateButton />
							{:else}
								<a
									class="btn btn-ghost"
									href="{resolve(localizeHref('/login') as Pathname)}?redirectTo={encodeURIComponent(
										`/r/${recipe.id}`
									)}"
								>
									{m.duplicate_button()}
								</a>
							{/if}
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
					{#if duplicateError}
						<p class="alert">{duplicateError}</p>
					{/if}
				{/if}
				{#if recipe.isPublic}
					{#key recipe.id}
						<RecipeRating
							recipeId={recipe.id}
							summary={recipe.ratingSummary}
							userRating={recipe.userRating}
							canRate={recipe.canRate}
							isSignedIn={recipe.isSignedIn}
							form={form?.form === 'rate' ? form : null}
						/>
					{/key}
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

		<div class="panel markdown-body" use:markdownLightbox>
			{@html recipe.html}
		</div>
	</article>
{:catch}
	<p class="alert">{m.error_not_found()}</p>
{/await}

<dialog
	class="image-lightbox"
	bind:this={imageDialog}
	aria-label={m.image_view_larger()}
	onclick={onLightboxClick}
>
	<div class="image-lightbox__inner">
		{#if lightboxSrc}
			<img src={lightboxSrc} alt={lightboxAlt} />
		{/if}
		<div class="image-lightbox__actions">
			<button class="btn btn-ghost" type="button" onclick={closeLightbox}>
				{m.action_cancel()}
			</button>
		</div>
	</div>
</dialog>

<style>
	.image-lightbox {
		width: min(100% - 2rem, 56rem);
		max-height: calc(100vh - 2rem);
		margin: auto;
		padding: 1rem;
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
		background: var(--color-bg-elevated);
		color: var(--color-ink);
		box-shadow: var(--shadow-soft);
	}

	.image-lightbox::backdrop {
		background: rgba(28, 36, 32, 0.45);
	}

	:global(html[data-theme='dark']) .image-lightbox::backdrop {
		background: rgba(0, 0, 0, 0.55);
	}

	.image-lightbox__inner {
		display: grid;
		gap: 1rem;
	}

	.image-lightbox__inner img {
		width: 100%;
		height: auto;
		max-height: calc(100vh - 8rem);
		object-fit: contain;
		border-radius: var(--radius);
		background: var(--color-cover-fallback);
	}

	.image-lightbox__actions {
		display: flex;
		justify-content: flex-end;
	}
</style>
