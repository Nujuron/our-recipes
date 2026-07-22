<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { deLocalizeHref, localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';

	const currentPath = $derived(deLocalizeHref(page.url.pathname));
	const onCooked = $derived(currentPath === '/me/cooked' || currentPath.startsWith('/me/cooked/'));
</script>

<nav class="me-tabs" aria-label={m.me_sections()}>
	<a
		class="me-tabs__link"
		class:is-active={!onCooked}
		href={resolve(localizeHref('/me') as Pathname)}
		aria-current={!onCooked ? 'page' : undefined}
	>
		{m.me_title()}
	</a>
	<a
		class="me-tabs__link"
		class:is-active={onCooked}
		href={resolve(localizeHref('/me/cooked') as Pathname)}
		aria-current={onCooked ? 'page' : undefined}
	>
		{m.cooked_list_title()}
	</a>
</nav>
