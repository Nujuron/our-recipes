<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { deLocalizeHref, localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';
	import LocaleSelect from '$lib/components/LocaleSelect.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';

	type Props = {
		user: { id: string } | null;
		displayName?: string | null;
	};

	let { user, displayName = null }: Props = $props();

	const currentPath = $derived(deLocalizeHref(page.url.pathname));

	const isActive = (href: string) => {
		if (href === '/') return currentPath === '/';
		return currentPath === href || currentPath.startsWith(`${href}/`);
	};
</script>

<header class="site-header">
	<div class="site-header__inner">
		<a class="brand" href={resolve(localizeHref('/') as Pathname)}>{m.brand_name()}</a>

		<nav class="nav nav--desktop" aria-label={m.nav_menu()}>
			<a href={resolve(localizeHref('/') as Pathname)}>{m.nav_home()}</a>
			{#if user}
				<a href={resolve(localizeHref('/me') as Pathname)}>{m.nav_my_recipes()}</a>
				<a href={resolve(localizeHref('/recipes/new') as Pathname)}>{m.nav_new_recipe()}</a>
				<a
					class="profile-link"
					href={resolve(localizeHref('/me/profile') as Pathname)}
					aria-label={m.nav_profile()}
				>
					<UserAvatar name={displayName} label={m.nav_profile()} />
				</a>
			{:else}
				<a href={resolve(localizeHref('/login') as Pathname)}>{m.nav_login()}</a>
				<LocaleSelect />
			{/if}
			<ThemeToggle />
		</nav>

		<div class="nav-tools nav-tools--mobile">
			{#if user}
				<a
					class="profile-link"
					href={resolve(localizeHref('/me/profile') as Pathname)}
					aria-label={m.nav_profile()}
				>
					<UserAvatar name={displayName} label={m.nav_profile()} />
				</a>
			{:else}
				<a href={resolve(localizeHref('/login') as Pathname)}>{m.nav_login()}</a>
				<LocaleSelect />
			{/if}
			<ThemeToggle />
		</div>
	</div>
</header>

<nav class="bottom-nav" aria-label={m.nav_menu()}>
	<a
		class="bottom-nav__item"
		class:is-active={isActive('/')}
		href={resolve(localizeHref('/') as Pathname)}
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z"
			/>
		</svg>
		<span>{m.nav_home()}</span>
	</a>

	{#if user}
		<a
			class="bottom-nav__item"
			class:is-active={isActive('/me') && !isActive('/me/profile')}
			href={resolve(localizeHref('/me') as Pathname)}
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2Z"
				/>
			</svg>
			<span>{m.nav_my_recipes()}</span>
		</a>
	{/if}

	<a
		class="bottom-nav__item"
		class:is-active={isActive('/recipes/new') || (!user && isActive('/login'))}
		href={resolve(localizeHref(user ? '/recipes/new' : '/login') as Pathname)}
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				d="M12 5v14M5 12h14"
			/>
		</svg>
		<span>{m.nav_new_recipe()}</span>
	</a>
</nav>
