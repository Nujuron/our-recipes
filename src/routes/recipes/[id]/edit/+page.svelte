<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import FormPageSkeleton from '$lib/components/FormPageSkeleton.svelte';
	import RecipeForm from '$lib/components/RecipeForm.svelte';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';

	let { data, form } = $props();

	const errorMessage = $derived(
		form?.error === 'auth'
			? m.error_auth_required()
			: form?.error === 'forbidden'
				? m.error_forbidden()
				: form?.error
					? m.error_generic()
					: null
	);
</script>

{#await data.recipe}
	<FormPageSkeleton label={m.loading_recipe()} fields={5} />
{:then recipe}
	<RecipeForm
		mode="edit"
		values={recipe}
		error={errorMessage}
		publicPath={resolve(localizeHref(`/r/${recipe.id}`) as Pathname)}
	/>
{:catch}
	<p class="alert">{m.error_generic()}</p>
{/await}
