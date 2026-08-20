<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';
	import { formatShoppingItemAmount, type ShoppingItem } from '$lib/shoppingList';
	import { getShoppingCart } from '$lib/shoppingList.svelte';

	const cart = getShoppingCart();
	let customText = $state('');

	const pending = $derived(
		cart.items.filter((item) => !item.checked).toSorted((a, b) => a.name.localeCompare(b.name))
	);
	const bought = $derived(
		cart.items.filter((item) => item.checked).toSorted((a, b) => a.name.localeCompare(b.name))
	);

	function onAddCustom(event: SubmitEvent) {
		event.preventDefault();
		cart.addCustom(customText);
		customText = '';
	}

	function onClearAll() {
		if (!confirm(m.shopping_clear_all_confirm())) return;
		cart.clearAll();
	}

	function onToggle(item: ShoppingItem, event: Event) {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) return;
		cart.setChecked(item.id, target.checked);
	}
</script>

<svelte:head>
	<title>{m.shopping_title()} · {m.brand_name()}</title>
</svelte:head>

{#snippet itemRow(item: ShoppingItem, boughtLabel: boolean)}
	{@const amount = formatShoppingItemAmount(item)}
	<li class="shopping-item" class:is-checked={item.checked}>
		<label class="shopping-item__check">
			<input
				type="checkbox"
				checked={item.checked}
				onchange={(event) => onToggle(item, event)}
				aria-label={boughtLabel
					? m.shopping_mark_needed({ name: item.name })
					: m.shopping_mark_bought({ name: item.name })}
			/>
			<span class="shopping-item__copy">
				<strong>{item.name}</strong>
				{#if amount}
					<span class="meta">{amount}</span>
				{/if}
			</span>
		</label>
		{#if item.sources.length > 0 && !item.checked}
			<span class="meta shopping-item__sources">
				{#each item.sources as source, sourceIndex (source.recipeId)}
					{#if sourceIndex > 0}<span aria-hidden="true"> · </span>{/if}
					<a href={resolve(localizeHref(`/r/${source.recipeId}`) as Pathname)}>
						{source.recipeTitle}
					</a>
				{/each}
			</span>
		{/if}
		<button
			class="shopping-item__remove"
			type="button"
			aria-label={m.shopping_remove_item({ name: item.name })}
			onclick={() => cart.remove(item.id)}
		>
			×
		</button>
	</li>
{/snippet}

<section class="stack">
	<div>
		<h1>{m.shopping_title()}</h1>
		<p class="meta">{m.shopping_subtitle()}</p>
	</div>

	<form class="search-bar" onsubmit={onAddCustom}>
		<input
			type="text"
			bind:value={customText}
			placeholder={m.shopping_add_custom_placeholder()}
			aria-label={m.shopping_add_custom_label()}
			autocomplete="off"
		/>
		<button class="btn btn-primary" type="submit">{m.shopping_add_custom()}</button>
	</form>

	{#if !cart.ready}
		<div class="panel" aria-busy="true">
			<div class="skeleton-line" style="max-width: 14rem;"></div>
			<div class="skeleton-line"></div>
			<div class="skeleton-line" style="max-width: 70%;"></div>
		</div>
	{:else if cart.items.length === 0}
		<p class="empty">{m.shopping_empty()}</p>
	{:else}
		<div class="form-row" style="justify-content: space-between;">
			<p class="meta">{m.shopping_count({ count: cart.uncheckedCount })}</p>
			<div class="form-row">
				{#if bought.length > 0}
					<button class="btn btn-ghost" type="button" onclick={() => cart.clearChecked()}>
						{m.shopping_clear_checked()}
					</button>
				{/if}
				<button class="btn btn-ghost" type="button" onclick={onClearAll}>
					{m.shopping_clear_all()}
				</button>
			</div>
		</div>

		{#if pending.length > 0}
			<section class="panel shopping-group">
				<h2>{m.shopping_unchecked_heading()}</h2>
				<ul class="shopping-list">
					{#each pending as item (item.id)}
						{@render itemRow(item, false)}
					{/each}
				</ul>
			</section>
		{/if}

		{#if bought.length > 0}
			<section class="panel shopping-group">
				<h2>{m.shopping_checked_heading()}</h2>
				<ul class="shopping-list">
					{#each bought as item (item.id)}
						{@render itemRow(item, true)}
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
</section>
