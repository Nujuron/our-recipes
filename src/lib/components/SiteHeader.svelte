<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { deLocalizeHref, localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';
	import LocaleSelect from '$lib/components/LocaleSelect.svelte';
	import PwaInstallButton from '$lib/components/PwaInstallButton.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import logo from '$lib/assets/logo.png';
	import { getShoppingCart } from '$lib/shoppingList.svelte';

	type Props = {
		user: { id: string } | null;
		displayName?: string | null;
	};

	let { user, displayName = null }: Props = $props();

	const cart = getShoppingCart();
	const currentPath = $derived(deLocalizeHref(page.url.pathname));
	const cartCountLabel = $derived(
		cart.ready && cart.uncheckedCount > 0
			? cart.uncheckedCount > 99
				? '99+'
				: String(cart.uncheckedCount)
			: null
	);

	const isActive = (href: string) => {
		if (href === '/') return currentPath === '/';
		return currentPath === href || currentPath.startsWith(`${href}/`);
	};
</script>

<header class="site-header">
	<div class="site-header__inner">
		<a class="brand" href={resolve(localizeHref('/') as Pathname)}>
			<img src={logo} alt={m.brand_name()} width="256" height="256" />
		</a>

		<nav class="nav nav--desktop" aria-label={m.nav_menu()}>
			<a href={resolve(localizeHref('/') as Pathname)}>{m.nav_home()}</a>
			<a class="nav-cart" href={resolve(localizeHref('/shopping') as Pathname)}>
				{m.nav_shopping()}
				{#if cartCountLabel}
					<span class="nav-badge">{cartCountLabel}</span>
				{/if}
			</a>
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
			<PwaInstallButton />
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
			<PwaInstallButton />
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
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
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
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
			>
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
		class:is-active={isActive('/shopping')}
		href={resolve(localizeHref('/shopping') as Pathname)}
	>
		<span class="bottom-nav__icon">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
			>
				<path
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M6 8h15l-1.5 9H8L6 8Zm0 0L5 5H2M9 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
				/>
			</svg>
			{#if cartCountLabel}
				<span class="nav-badge nav-badge--float">{cartCountLabel}</span>
			{/if}
		</span>
		<span>{m.nav_shopping()}</span>
	</a>

	<a
		class="bottom-nav__item"
		class:is-active={isActive('/recipes/new')}
		href={resolve(localizeHref(user ? '/recipes/new' : '/login') as Pathname)}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 5v14M5 12h14" />
		</svg>
		<span>{m.nav_new_recipe()}</span>
	</a>
</nav>
