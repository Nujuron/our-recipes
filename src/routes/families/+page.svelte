<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import MeTabs from '$lib/components/MeTabs.svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';

	let { data, form } = $props();
</script>

<section class="stack">
	<h1>{m.families_title()}</h1>
	<MeTabs />

	<p class="meta">{m.families_subtitle()}</p>

	<form class="stack" method="POST" action="?/create" use:enhance>
		<label>
			{m.field_family_name()}
			<input name="name" type="text" maxlength="80" required autocomplete="off" />
		</label>
		{#if form?.error === 'missing'}
			<p class="alert">{m.error_family_name()}</p>
		{:else if form?.error === 'auth'}
			<p class="alert">{m.error_auth_required()}</p>
		{:else if form?.error}
			<p class="alert">{m.error_generic()}</p>
		{/if}
		<button class="btn btn-primary" type="submit">{m.family_create()}</button>
	</form>

	{#await data.families}
		<p class="meta loading-label">{m.loading_families()}</p>
	{:then families}
		{#if families.length === 0}
			<p class="empty">{m.families_empty()}</p>
		{:else}
			<ul class="family-list">
				{#each families as family (family.id)}
					<li>
						<a
							class="recipe-card"
							href={resolve(localizeHref(`/families/${family.id}`) as Pathname)}
						>
							<div class="recipe-card__body">
								<h2>{family.name}</h2>
								<p>
									{m.family_member_count({ count: family.memberCount })}
									{#if family.isPrimary}
										· {m.family_primary_badge()}
									{/if}
									{#if family.isCreator}
										· {m.family_creator_badge()}
									{/if}
								</p>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	{:catch}
		<p class="alert">{m.error_generic()}</p>
	{/await}
</section>
