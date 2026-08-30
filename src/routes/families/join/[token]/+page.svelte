<script lang="ts">
	import { enhance } from '$app/forms';
	import * as m from '$lib/paraglide/messages';

	let { data, form } = $props();
</script>

<section class="stack family-join">
	<h1>{m.family_join_title()}</h1>

	{#if data.invalid}
		<p class="alert">{m.error_family_invite()}</p>
	{:else}
		<p>
			{data.familyName
				? m.family_join_prompt({ name: data.familyName })
				: m.family_join_prompt_generic()}
		</p>
		{#if form?.error === 'invalid_invite'}
			<p class="alert">{m.error_family_invite()}</p>
		{:else if form?.error === 'auth'}
			<p class="alert">{m.error_auth_required()}</p>
		{:else if form?.error}
			<p class="alert">{m.error_generic()}</p>
		{/if}
		<form method="POST" use:enhance>
			<button class="btn btn-primary btn-sm" type="submit">{m.family_join()}</button>
		</form>
	{/if}
</section>
