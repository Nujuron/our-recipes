<script lang="ts">
	import FormPageSkeleton from '$lib/components/FormPageSkeleton.svelte';
	import RecipeForm from '$lib/components/RecipeForm.svelte';
	import * as m from '$lib/paraglide/messages';

	let { data, form } = $props();

	const errorMessage = $derived(
		form?.error === 'auth'
			? m.error_auth_required()
			: form?.error
				? m.error_generic()
				: null
	);
</script>

{#await data.defaultLocale}
	<FormPageSkeleton label={m.loading_recipe()} fields={5} />
{:then defaultLocale}
	<RecipeForm mode="create" error={errorMessage} values={{ locale: defaultLocale }} />
{:catch}
	<RecipeForm mode="create" error={errorMessage} values={{ locale: 'en' }} />
{/await}
