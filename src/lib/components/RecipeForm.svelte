<script lang="ts">
	import { enhance } from '$app/forms';
	import { onDestroy, onMount, untrack } from 'svelte';
	import RecipeBodyEditor from '$lib/components/RecipeBodyEditor.svelte';
	import StructuredIngredientsEditor from '$lib/components/StructuredIngredientsEditor.svelte';
	import StepsEditor from '$lib/components/StepsEditor.svelte';
	import {
		DEFAULT_SERVINGS,
		SERVINGS_MAX,
		SERVINGS_MIN,
		type RecipeIngredient
	} from '$lib/ingredients';
	import type { Allergen } from '$lib/allergens';
	import { COURSES, EFFORTS, type RecipeCourse, type RecipeEffort } from '$lib/classifications';
	import { courseLabel, effortLabel } from '$lib/classificationLabels';
	import AllergenPicker from '$lib/components/AllergenPicker.svelte';
	import * as m from '$lib/paraglide/messages';

	type RecipeLocale = 'en' | 'es' | 'de' | 'other';

	type Props = {
		mode: 'create' | 'edit';
		values?: {
			title?: string;
			summary?: string | null;
			ingredients?: RecipeIngredient[] | string | null;
			steps?: string | null;
			body_md?: string;
			servings?: number;
			allergens?: Allergen[];
			course?: RecipeCourse | null;
			effort?: RecipeEffort | null;
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

	onMount(() => {
		const header = document.querySelector<HTMLElement>('.site-header');
		if (!header) return;

		const syncHeaderOffset = () => {
			document.documentElement.style.setProperty(
				'--site-header-offset',
				`${header.getBoundingClientRect().height}px`
			);
		};

		syncHeaderOffset();
		const observer = new ResizeObserver(syncHeaderOffset);
		observer.observe(header);

		return () => {
			observer.disconnect();
		};
	});
</script>

<section class="stack recipe-form-page">
	{#if error}
		<p class="alert">{error}</p>
	{/if}

	<form
		id="recipe-form"
		class="panel form recipe-form"
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
		<header class="recipe-form__topbar">
			<div class="recipe-form__topbar-copy">
				<h1>{mode === 'create' ? m.recipe_new_title() : m.recipe_edit_title()}</h1>
				{#if publicPath}
					<p class="meta">
						<a href={publicPath}>{m.view_public()}</a>
					</p>
				{/if}
			</div>
			<button
				class="btn btn-primary recipe-form__save--mobile"
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
		</header>

		<div class="recipe-form__actions recipe-form__actions--desktop">
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
		</div>

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
			{m.field_servings()}
			<input
				name="servings"
				type="number"
				required
				min={SERVINGS_MIN}
				max={SERVINGS_MAX}
				step="1"
				value={values.servings ?? DEFAULT_SERVINGS}
			/>
			<span class="meta">{m.field_servings_hint()}</span>
		</label>

		<div class="classification-fields">
			<label>
				{m.field_course()}
				<select name="course" value={values.course ?? ''}>
					<option value="">{m.field_course_unset()}</option>
					{#each COURSES as item (item)}
						<option value={item}>{courseLabel(item)}</option>
					{/each}
				</select>
			</label>
			<label>
				{m.field_effort()}
				<select name="effort" value={values.effort ?? ''}>
					<option value="">{m.field_effort_unset()}</option>
					{#each EFFORTS as item (item)}
						<option value={item}>{effortLabel(item)}</option>
					{/each}
				</select>
			</label>
		</div>

		<AllergenPicker value={values.allergens ?? []} />

		<label>
			{m.field_ingredients()}
			<StructuredIngredientsEditor value={values.ingredients ?? null} />
			<span class="meta">{m.field_ingredients_hint()}</span>
		</label>

		<div>
			<StepsEditor value={values.steps ?? ''} />
			<span class="meta">{m.field_steps_hint()}</span>
		</div>

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

		{#if mode === 'edit'}
			<div class="form-row">
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
			</div>
		{/if}
	</form>
</section>
