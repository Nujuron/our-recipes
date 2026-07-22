<script lang="ts">
	import { page } from '$app/state';
	import FormPageSkeleton from '$lib/components/FormPageSkeleton.svelte';
	import { locales, type Locale } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';

	let { data, form } = $props();

	const saved = $derived(page.url.searchParams.get('saved') === '1');

	const localeLabel = (locale: Locale): string => {
		switch (locale) {
			case 'en':
				return m.locale_en();
			case 'es':
				return m.locale_es();
			case 'de':
				return m.locale_de();
			default: {
				const _exhaustive: never = locale;
				return _exhaustive;
			}
		}
	};

	const errorMessage = $derived.by(() => {
		if (!form?.error) return null;
		if (form.error === 'auth') return m.error_auth_required();
		return String(form.error);
	});
</script>

{#await data.page}
	<div style="max-width: 32rem; margin-inline: auto;">
		<FormPageSkeleton label={m.loading_profile()} fields={3} />
	</div>
{:then pageData}
	<section class="stack" style="max-width: 32rem; margin-inline: auto;">
		<div>
			<h1>{m.profile_title()}</h1>
		</div>

		{#if saved}
			<p class="alert alert-success">{m.profile_saved()}</p>
		{:else if errorMessage}
			<p class="alert">{errorMessage}</p>
		{/if}

		<form class="panel form" method="POST">
			<label>
				{m.field_email()}
				<input type="email" value={pageData.email} disabled readonly />
			</label>

			<label>
				{m.field_display_name()}
				<input
					name="displayName"
					type="text"
					autocomplete="name"
					placeholder={m.placeholder_display_name()}
					value={form?.displayName ?? pageData.profile.display_name ?? ''}
				/>
			</label>

			<label>
				{m.profile_language()}
				<select
					name="preferred_locale"
					value={form?.preferred_locale ?? pageData.profile.preferred_locale}
				>
					{#each locales as locale (locale)}
						<option value={locale}>{localeLabel(locale)}</option>
					{/each}
			</select>
		</label>

			<button class="btn btn-primary" type="submit">{m.profile_save()}</button>
		</form>

		<form method="POST" action="/auth/logout">
			<button class="btn btn-ghost" type="submit" style="width: 100%;">{m.nav_logout()}</button>
		</form>
	</section>
{:catch}
	<section class="stack" style="max-width: 32rem; margin-inline: auto;">
		<p class="alert">{m.error_generic()}</p>
	</section>
{/await}
