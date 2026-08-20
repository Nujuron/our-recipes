<script lang="ts">
	import { browser } from '$app/environment';
	import { navigating } from '$app/state';
	import { onMount } from 'svelte';
	import { getLocale, isLocale, setLocale } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import PwaIosHint from '$lib/components/PwaIosHint.svelte';
	import { ShoppingCart, setShoppingCart } from '$lib/shoppingList.svelte';
	import { PwaInstall, setPwaInstall } from '$lib/pwaInstall.svelte';
	import '$lib/styles/app.css';

	let { children, data } = $props();

	const cart = new ShoppingCart();
	setShoppingCart(cart);

	const pwaInstall = new PwaInstall();
	setPwaInstall(pwaInstall);

	const isNavigating = $derived(Boolean(navigating.to));

	onMount(() => {
		cart.hydrate();
		pwaInstall.hydrate();
	});

	$effect(() => {
		if (!browser) return;
		const preferred = data.profile?.preferred_locale;
		if (!preferred || !isLocale(preferred)) return;
		if (getLocale() === preferred) return;
		setLocale(preferred);
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&family=Source+Sans+3:wght@400;600;700&display=swap"
		rel="stylesheet"
	/>
	<title>{m.brand_name()}</title>
</svelte:head>

{#if isNavigating}
	<div class="nav-progress" aria-hidden="true"></div>
{/if}

<div class="site-shell" class:is-navigating={isNavigating}>
	<SiteHeader user={data.user} displayName={data.profile?.display_name} />
	<PwaIosHint />

	<main class="site-main">
		{@render children()}
	</main>

	<footer class="site-footer">
		<div class="site-footer__inner">
			<p>{m.footer_note()}</p>
		</div>
	</footer>
</div>

{#await import('$lib/components/PwaUpdateToast.svelte') then { default: PwaUpdateToast }}
	<PwaUpdateToast />
{/await}
