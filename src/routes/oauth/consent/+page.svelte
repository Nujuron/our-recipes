<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	let { data, form } = $props();
</script>

<section class="panel stack" style="max-width: 32rem; margin-inline: auto;">
	{#if data.status === 'missing'}
		<h1>{m.oauth_consent_title()}</h1>
		<p class="alert">{m.oauth_consent_missing()}</p>
	{:else if data.status === 'error'}
		<h1>{m.oauth_consent_title()}</h1>
		<p class="alert">{data.message === 'invalid' ? m.oauth_consent_invalid() : data.message}</p>
	{:else}
		<h1>{m.oauth_consent_title()}</h1>
		<p>{m.oauth_consent_intro({ client: data.clientName })}</p>
		<p class="meta">{m.oauth_consent_privacy()}</p>

		{#if data.scopes.length > 0}
			<p><strong>{m.oauth_consent_scopes()}</strong></p>
			<ul>
				{#each data.scopes as scope (scope)}
					<li>{scope}</li>
				{/each}
			</ul>
		{/if}

		{#if form?.error}
			<p class="alert">{form.error === 'auth' ? m.error_auth_required() : String(form.error)}</p>
		{/if}

		<div class="form-row">
			<form method="POST" action="?/deny">
				<input type="hidden" name="authorization_id" value={data.authorizationId} />
				<button class="btn btn-ghost" type="submit">{m.oauth_consent_deny()}</button>
			</form>
			<form method="POST" action="?/approve">
				<input type="hidden" name="authorization_id" value={data.authorizationId} />
				<button class="btn btn-primary" type="submit">{m.oauth_consent_approve()}</button>
			</form>
		</div>
	{/if}
</section>
