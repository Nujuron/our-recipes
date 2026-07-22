<script lang="ts">
	import { enhance } from '$app/forms';
	import { onDestroy, untrack } from 'svelte';
	import RecipeBodyEditor from '$lib/components/RecipeBodyEditor.svelte';
	import IngredientsEditor from '$lib/components/IngredientsEditor.svelte';
	import * as m from '$lib/paraglide/messages';

	type RecipeLocale = 'en' | 'es' | 'de' | 'other';

	type Props = {
		mode: 'create' | 'edit';
		values?: {
			title?: string;
			summary?: string | null;
			ingredients?: string | null;
			body_md?: string;
			is_public?: boolean;
			locale?: RecipeLocale;
			coverUrl?: string | null;
		};
		error?: string | null;
		publicPath?: string | null;
	};

	let { mode, values = {}, error = null, publicPath = null }: Props = $props();

	const defaultLocale = $derived(values.locale ?? 'en');

	let isPublic = $state(untrack(() => values.is_public ?? false));
	let coverPreview = $state<string | null>(untrack(() => values.coverUrl ?? null));
	let coverInput = $state<HTMLInputElement | null>(null);
	let isSaving = $state(false);
	let isDeleting = $state(false);
	let objectUrl: string | null = null;

	function setCoverFile(file: File | null) {
		if (objectUrl) {
			URL.revokeObjectURL(objectUrl);
			objectUrl = null;
		}

		if (!file) {
			coverPreview = values.coverUrl ?? null;
			if (coverInput) coverInput.value = '';
			return;
		}

		objectUrl = URL.createObjectURL(file);
		coverPreview = objectUrl;

		if (coverInput) {
			const transfer = new DataTransfer();
			transfer.items.add(file);
			coverInput.files = transfer.files;
		}
	}

	function onCoverChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		setCoverFile(input.files?.[0] ?? null);
	}

	function onCoverPaste(event: ClipboardEvent) {
		const items = event.clipboardData?.items;
		if (!items) return;

		for (const item of items) {
			if (!item.type.startsWith('image/')) continue;

			const file = item.getAsFile();
			if (!file) continue;

			event.preventDefault();
			const extension = item.type.split('/')[1] || 'png';
			const namedFile =
				file.name && file.name !== 'image.png'
					? file
					: new File([file], `pasted-cover.${extension}`, { type: file.type });
			setCoverFile(namedFile);
			return;
		}
	}

	onDestroy(() => {
		if (objectUrl) URL.revokeObjectURL(objectUrl);
	});
</script>

<section class="stack">
	<div>
		<h1>{mode === 'create' ? m.recipe_new_title() : m.recipe_edit_title()}</h1>
		{#if publicPath}
			<p class="meta">
				<a href={publicPath}>{m.view_public()}</a>
			</p>
		{/if}
	</div>

	{#if error}
		<p class="alert">{error}</p>
	{/if}

	<form
		class="panel form"
		method="POST"
		action={mode === 'edit' ? '?/save' : undefined}
		enctype="multipart/form-data"
		use:enhance={({ submitter }) => {
			const isDelete =
				submitter instanceof HTMLButtonElement &&
				submitter.getAttribute('formaction')?.includes('delete');

			if (isDelete) {
				isDeleting = true;
				return async ({ update }) => {
					try {
						await update();
					} finally {
						isDeleting = false;
					}
				};
			}

			isSaving = true;
			return async ({ update }) => {
				try {
					await update();
				} finally {
					isSaving = false;
				}
			};
		}}
	>
		<label>
			{m.field_title()}
			<input
				name="title"
				required
				maxlength="160"
				placeholder={m.placeholder_title()}
				value={values.title ?? ''}
			/>
		</label>

		<label>
			{m.field_summary()}
			<input
				name="summary"
				maxlength="240"
				placeholder={m.placeholder_summary()}
				value={values.summary ?? ''}
			/>
		</label>

		<label>
			{m.field_ingredients()}
			<IngredientsEditor
				value={values.ingredients ?? ''}
				placeholder={m.placeholder_ingredients()}
			/>
			<span class="meta">{m.field_ingredients_hint()}</span>
		</label>

		<RecipeBodyEditor value={values.body_md ?? ''} placeholder={m.field_body_hint()} />

		<div class="form-meta">
			<label>
				{m.field_locale()}
				<select name="locale" value={defaultLocale}>
					<option value="en">{m.locale_en()}</option>
					<option value="es">{m.locale_es()}</option>
					<option value="de">{m.locale_de()}</option>
					<option value="other">{m.locale_other()}</option>
				</select>
			</label>

			<div class="cover-field">
				<span class="cover-field__label">{m.field_cover()}</span>
				<div
					class="cover-picker"
					tabindex="0"
					role="group"
					aria-label={m.field_cover()}
					onpaste={onCoverPaste}
				>
					{#if coverPreview}
						<img class="cover-picker__preview" src={coverPreview} alt="" />
					{:else}
						<div class="cover-picker__empty">
							<span>{m.field_cover_empty()}</span>
							<span class="cover-picker__paste-hint">{m.field_cover_paste_hint()}</span>
						</div>
					{/if}
					<label class="cover-picker__action btn btn-ghost">
						{coverPreview ? m.field_cover_change() : m.field_cover_choose()}
						<input
							bind:this={coverInput}
							class="cover-picker__input"
							name="cover"
							type="file"
							accept="image/*"
							onchange={onCoverChange}
						/>
					</label>
				</div>
			</div>
		</div>

		<div class="public-field">
			<label class="checkbox">
				<input name="is_public" type="checkbox" bind:checked={isPublic} />
				{m.field_public()}
			</label>
			{#if isPublic}
				<p class="alert alert-warning" role="status">{m.field_public_warning()}</p>
			{/if}
		</div>

		<div class="form-row">
			<button
				class="btn btn-primary"
				type="submit"
				disabled={isSaving || isDeleting}
				aria-busy={isSaving}
			>
				{#if isSaving}
					<span class="btn__spinner" aria-hidden="true"></span>
					{m.saving_recipe()}
				{:else}
					{m.save_recipe()}
				{/if}
			</button>
			{#if mode === 'edit'}
				<button
					class="btn btn-danger"
					formaction="?/delete"
					type="submit"
					disabled={isSaving || isDeleting}
					aria-busy={isDeleting}
					onclick={(event) => {
						if (!confirm(m.delete_confirm())) event.preventDefault();
					}}
				>
					{#if isDeleting}
						<span class="btn__spinner" aria-hidden="true"></span>
						{m.deleting_recipe()}
					{:else}
						{m.delete_recipe()}
					{/if}
				</button>
			{/if}
		</div>
	</form>
</section>
