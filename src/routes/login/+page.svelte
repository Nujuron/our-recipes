<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import GoogleIcon from '$lib/components/GoogleIcon.svelte';
	import PasswordInput from '$lib/components/PasswordInput.svelte';
	import { getLocale, localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';

	let { form, data } = $props();

	const mode = $derived(form?.mode === 'signup' || form?.mode === 'signin' ? form.mode : data.mode);
	const needsConfirmation = $derived(Boolean(form?.needsConfirmation));
	const currentLocale = $derived(getLocale());
	const signInHref = $derived(
		`${resolve(localizeHref('/login') as Pathname)}?redirectTo=${encodeURIComponent(data.redirectTo)}`
	);

	const errorMessage = $derived.by(() => {
		if (!form?.error) return null;
		if (form.error === 'missing') return m.error_auth_missing();
		if (form.error === 'weak_password') return m.error_auth_weak_password();
		return String(form.error);
	});
</script>

<section class="panel stack" style="max-width: 28rem; margin-inline: auto;">
	{#if needsConfirmation}
		<div>
			<h1>{m.signup_check_email_title()}</h1>
			<p class="meta">
				{#if form?.email}
					{m.signup_check_email({ email: form.email })}
				{:else}
					{m.signup_check_email_fallback()}
				{/if}
			</p>
		</div>

		<a class="btn btn-primary" href={signInHref} style="width: 100%;">{m.signup_back_to_signin()}</a>
	{:else}
		<div>
			<h1>{mode === 'signup' ? m.signup_title() : m.login_title()}</h1>
			<p class="meta">{mode === 'signup' ? m.signup_subtitle() : m.login_subtitle()}</p>
		</div>

		{#if errorMessage}
			<p class="alert">{errorMessage}</p>
		{/if}

		<form class="form" method="POST" action={mode === 'signup' ? '?/signup' : '?/signin'}>
			<input type="hidden" name="redirectTo" value={data.redirectTo} />
			<input type="hidden" name="preferred_locale" value={currentLocale} />

			{#if mode === 'signup'}
				<label>
					{m.field_display_name()}
					<input
						name="displayName"
						type="text"
						autocomplete="name"
						placeholder={m.placeholder_display_name()}
						value={form?.displayName ?? ''}
					/>
				</label>
			{/if}

			<label>
				{m.field_email()}
				<input
					name="email"
					type="email"
					required
					autocomplete="email"
					placeholder={m.placeholder_email()}
					value={form?.email ?? ''}
				/>
			</label>

			<label>
				{m.field_password()}
				<PasswordInput
					name="password"
					required
					minlength={6}
					autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
					placeholder={m.placeholder_password()}
				/>
			</label>

			<button class="btn btn-primary" type="submit" style="width: 100%;">
				{mode === 'signup' ? m.signup_submit() : m.login_submit()}
			</button>
		</form>

		<p class="meta" style="text-align: center; margin: 0;">
			{#if mode === 'signup'}
				{m.signup_have_account()}
				<a href={signInHref}>{m.login_submit()}</a>
			{:else}
				{m.login_no_account()}
				<a
					href={`${resolve(localizeHref('/login') as Pathname)}?mode=signup&redirectTo=${encodeURIComponent(data.redirectTo)}`}
				>
					{m.signup_submit()}
				</a>
			{/if}
		</p>

		<div class="form-row" style="justify-content: center;">
			<span class="meta">{m.login_or()}</span>
		</div>

		<form method="POST" action="?/google">
			<input type="hidden" name="redirectTo" value={data.redirectTo} />
			<button class="btn btn-ghost" type="submit" style="width: 100%;">
				<GoogleIcon />
				{m.login_google()}
			</button>
		</form>
	{/if}
</section>
