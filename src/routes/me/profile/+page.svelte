<script lang="ts">
	import { page } from '$app/state';
	import FormPageSkeleton from '$lib/components/FormPageSkeleton.svelte';
	import GoogleIcon from '$lib/components/GoogleIcon.svelte';
	import { locales, type Locale } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';

	let { data, form } = $props();

	let passwordDialog: HTMLDialogElement | undefined = $state();

	const saved = $derived(page.url.searchParams.get('saved') === '1');
	const passwordSaved = $derived(page.url.searchParams.get('password') === '1');
	const googleLinked = $derived(page.url.searchParams.get('google') === '1');

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

	const profileError = $derived.by(() => {
		if (!form?.error || form.form !== 'profile') return null;
		if (form.error === 'auth') return m.error_auth_required();
		return String(form.error);
	});

	const passwordError = $derived.by(() => {
		if (!form?.error || form.form !== 'password') return null;
		if (form.error === 'auth') return m.error_auth_required();
		if (form.error === 'password_missing') return m.error_auth_password_missing();
		if (form.error === 'weak_password') return m.error_auth_weak_password();
		if (form.error === 'password_mismatch') return m.error_auth_password_mismatch();
		if (form.error === 'password_incorrect') return m.error_auth_password_incorrect();
		return String(form.error);
	});

	const googleError = $derived.by(() => {
		if (!form?.error || form.form !== 'google') return null;
		if (form.error === 'auth') return m.error_auth_required();
		return String(form.error);
	});

	const openPasswordDialog = () => {
		passwordDialog?.showModal();
	};

	const closePasswordDialog = () => {
		passwordDialog?.close();
	};

	const onPasswordDialogClick = (event: MouseEvent) => {
		if (event.target === passwordDialog) {
			closePasswordDialog();
		}
	};

	$effect(() => {
		if (passwordError && passwordDialog && !passwordDialog.open) {
			passwordDialog.showModal();
		}
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
		{:else if profileError}
			<p class="alert">{profileError}</p>
		{/if}

		<form class="panel form" method="POST" action="?/updateProfile">
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
					value={form?.form === 'profile'
						? (form.displayName ?? '')
						: (pageData.profile.display_name ?? '')}
				/>
			</label>

			<label>
				{m.profile_language()}
				<select
					name="preferred_locale"
					value={form?.form === 'profile'
						? form.preferred_locale
						: pageData.profile.preferred_locale}
				>
					{#each locales as locale (locale)}
						<option value={locale}>{localeLabel(locale)}</option>
					{/each}
				</select>
			</label>

			<button class="btn btn-primary" type="submit">{m.profile_save()}</button>
		</form>

		{#if passwordSaved}
			<p class="alert alert-success">{m.profile_password_saved()}</p>
		{/if}

		{#if googleLinked}
			<p class="alert alert-success">{m.profile_google_linked_success()}</p>
		{:else if googleError}
			<p class="alert">{googleError}</p>
		{/if}

		{#if pageData.hasGoogle}
			<p class="profile-google-status" aria-live="polite">
				<GoogleIcon />
				{m.profile_google_linked()}
			</p>
		{:else}
			<form method="POST" action="?/linkGoogle">
				<button class="btn btn-ghost" type="submit" style="width: 100%;">
					<GoogleIcon />
					{m.profile_google_link()}
				</button>
			</form>
		{/if}

		<button class="btn btn-ghost" type="button" style="width: 100%;" onclick={openPasswordDialog}>
			{m.profile_password_title()}
		</button>

		<dialog
			class="password-dialog"
			bind:this={passwordDialog}
			aria-labelledby="password-dialog-title"
			onclick={onPasswordDialogClick}
		>
			<form class="form" method="POST" action="?/changePassword">
				<h2 id="password-dialog-title">{m.profile_password_title()}</h2>

				{#if passwordError}
					<p class="alert">{passwordError}</p>
				{/if}

				<label>
					{m.field_current_password()}
					<input
						name="currentPassword"
						type="password"
						autocomplete="current-password"
						required
					/>
				</label>

				<label>
					{m.field_new_password()}
					<input
						name="newPassword"
						type="password"
						autocomplete="new-password"
						minlength="6"
						required
					/>
				</label>

				<label>
					{m.field_confirm_password()}
					<input
						name="confirmPassword"
						type="password"
						autocomplete="new-password"
						minlength="6"
						required
					/>
				</label>

				<div class="password-dialog__actions">
					<button class="btn btn-ghost" type="button" onclick={closePasswordDialog}>
						{m.action_cancel()}
					</button>
					<button class="btn btn-primary" type="submit">{m.profile_password_save()}</button>
				</div>
			</form>
		</dialog>

		<form method="POST" action="/auth/logout">
			<button class="btn btn-ghost" type="submit" style="width: 100%;">{m.nav_logout()}</button>
		</form>
	</section>
{:catch}
	<section class="stack" style="max-width: 32rem; margin-inline: auto;">
		<p class="alert">{m.error_generic()}</p>
	</section>
{/await}

<style>
	.profile-google-status {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		margin: 0;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		color: var(--color-ink-muted);
		font-weight: 500;
	}

	.password-dialog {
		width: min(100% - 2rem, 28rem);
		margin: auto;
		padding: 1.25rem;
		border: 1px solid var(--color-line);
		border-radius: var(--radius);
		background: var(--color-bg-elevated);
		color: var(--color-ink);
		box-shadow: var(--shadow-soft);
	}

	.password-dialog::backdrop {
		background: rgba(28, 36, 32, 0.45);
	}

	:global(html[data-theme='dark']) .password-dialog::backdrop {
		background: rgba(0, 0, 0, 0.55);
	}

	.password-dialog h2 {
		margin: 0;
		font-size: 1.2rem;
	}

	.password-dialog__actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.75rem;
	}
</style>
