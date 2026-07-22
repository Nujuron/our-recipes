<script lang="ts">
	import { getLocale, isLocale, locales, setLocale, type Locale } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';

	const currentLocale = $derived(getLocale());

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

	function onChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		if (isLocale(value)) {
			setLocale(value);
		}
	}
</script>

<label class="locale-select">
	<span class="visually-hidden">{m.nav_language()}</span>
	<select value={currentLocale} onchange={onChange} aria-label={m.nav_language()}>
		{#each locales as locale (locale)}
			<option value={locale}>{localeLabel(locale)}</option>
		{/each}
	</select>
</label>
