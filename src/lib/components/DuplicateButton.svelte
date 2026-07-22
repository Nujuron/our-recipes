<script lang="ts">
	import { enhance } from '$app/forms';
	import * as m from '$lib/paraglide/messages';

	let isDuplicating = $state(false);
</script>

<form
	method="POST"
	action="?/duplicate"
	use:enhance={() => {
		isDuplicating = true;
		return async ({ update }) => {
			try {
				await update();
			} finally {
				isDuplicating = false;
			}
		};
	}}
>
	<button class="btn btn-ghost" type="submit" disabled={isDuplicating} aria-busy={isDuplicating}>
		{#if isDuplicating}
			<span class="btn__spinner" aria-hidden="true"></span>
			{m.duplicate_saving()}
		{:else}
			{m.duplicate_button()}
		{/if}
	</button>
</form>
