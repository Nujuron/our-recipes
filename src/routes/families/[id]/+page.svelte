<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import AllergenBadges from '$lib/components/AllergenBadges.svelte';
	import ClassificationBadges from '$lib/components/ClassificationBadges.svelte';
	import RecipeGridSkeleton from '$lib/components/RecipeGridSkeleton.svelte';
	import ShareButton from '$lib/components/ShareButton.svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';

	let { data, form } = $props();
</script>

<section class="stack">
	<p>
		<a href={resolve(localizeHref('/families') as Pathname)}>{m.families_title()}</a>
	</p>
	<h1>{data.family.name}</h1>
	<p class="meta">
		{m.family_member_count({ count: data.family.memberCount })}
		{#if data.family.isPrimary}
			· {m.family_primary_badge()}
		{/if}
	</p>

	{#if form?.error === 'auth'}
		<p class="alert">{m.error_auth_required()}</p>
	{:else if form?.error}
		<p class="alert">{m.error_generic()}</p>
	{/if}

	<div class="form-row">
		{#if !data.family.isPrimary}
			<form method="POST" action="?/primary" use:enhance>
				<button class="btn btn-ghost" type="submit">{m.family_make_primary()}</button>
			</form>
		{/if}
		<form method="POST" action="?/leave" use:enhance>
			<button class="btn btn-ghost" type="submit">{m.family_leave()}</button>
		</form>
		{#if data.family.isCreator}
			<form
				method="POST"
				action="?/delete"
				use:enhance
			>
				<button
					class="btn btn-danger"
					type="submit"
					onclick={(event) => {
						if (!confirm(m.family_delete_confirm())) event.preventDefault();
					}}
				>
					{m.family_delete()}
				</button>
			</form>
		{/if}
	</div>

	{#if data.family.isCreator}
		<section class="stack">
			<h2>{m.family_invite_title()}</h2>
			<p class="meta">{m.family_invite_help()}</p>
			{#if data.inviteUrl}
				<ShareButton title={data.family.name} text={m.family_invite_share_text()} url={data.inviteUrl} />
				<p class="meta"><code>{data.inviteUrl}</code></p>
			{/if}
			<form method="POST" action="?/invite" use:enhance>
				<button class="btn btn-primary" type="submit">
					{data.inviteUrl ? m.family_invite_rotate() : m.family_invite_create()}
				</button>
			</form>
		</section>
	{/if}

	<section class="stack">
		<h2>{m.family_members_title()}</h2>
		<ul class="family-members">
			{#each data.members as member (member.userId)}
				<li class="form-row">
					<span>
						{member.displayName || m.family_member_anonymous()}
						{#if member.role === 'creator'}
							· {m.family_creator_badge()}
						{/if}
					</span>
					{#if data.family.isCreator && member.userId !== data.userId}
						<form method="POST" action="?/remove" use:enhance>
							<input type="hidden" name="member_id" value={member.userId} />
							<button class="btn btn-ghost" type="submit">{m.family_remove_member()}</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	<section class="stack">
		<h2>{m.family_recipes_title()}</h2>
		{#await data.recipes}
			<RecipeGridSkeleton count={3} />
		{:then result}
			{#if result.error}
				<p class="alert">{result.error}</p>
			{/if}
			{#if result.items.length === 0}
				<p class="empty">{m.family_recipes_empty()}</p>
			{:else}
				<div class="recipe-grid">
					{#each result.items as recipe (recipe.id)}
						<a class="recipe-card" href={resolve(localizeHref(`/r/${recipe.id}`) as Pathname)}>
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
								<ClassificationBadges course={recipe.course} effort={recipe.effort} />
								<AllergenBadges allergens={recipe.allergens ?? []} compact />
							</div>
						</a>
					{/each}
				</div>
			{/if}
		{:catch}
			<p class="alert">{m.error_generic()}</p>
		{/await}
	</section>
</section>
