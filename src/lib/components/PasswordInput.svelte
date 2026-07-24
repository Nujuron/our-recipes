<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	type Props = {
		name: string;
		id?: string;
		autocomplete?: 'current-password' | 'new-password' | 'off';
		placeholder?: string;
		required?: boolean;
		minlength?: number;
		value?: string;
	};

	let {
		name,
		id,
		autocomplete = 'current-password',
		placeholder,
		required = false,
		minlength,
		value
	}: Props = $props();

	let visible = $state(false);

	const toggleLabel = $derived(visible ? m.password_hide() : m.password_show());

	const toggleVisibility = (event: MouseEvent) => {
		event.preventDefault();
		visible = !visible;
	};
</script>

<span class="password-input">
	<input
		{name}
		{id}
		type={visible ? 'text' : 'password'}
		{autocomplete}
		{placeholder}
		{required}
		minLength={minlength}
		{value}
		class="password-input__field"
	/>
	<button
		type="button"
		class="password-input__toggle"
		aria-label={toggleLabel}
		aria-pressed={visible}
		title={toggleLabel}
		onclick={toggleVisibility}
	>
		{#if visible}
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.4 10.4 0 0 1 12 5c5 0 8.5 4.5 9.5 6-.4.6-1.2 1.7-2.5 2.9M6.1 6.1C4.3 7.5 3.2 9.2 2.5 11c1 1.5 4.5 6 9.5 6 1.2 0 2.3-.2 3.3-.6"
				/>
			</svg>
		{:else}
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M2.5 12C3.5 10.5 7 6 12 6s8.5 4.5 9.5 6c-1 1.5-4.5 6-9.5 6s-8.5-4.5-9.5-6Z"
				/>
				<circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.8" />
			</svg>
		{/if}
	</button>
</span>
