<script lang="ts">
	import type { Pathname } from '$app/types';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { NOTE_MAX_LENGTH } from '$lib/ratings';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';
	import { onDestroy, untrack } from 'svelte';

	type RatingSummary = { average: number | null; count: number };
	type UserRating = { score: number; note: string | null };

	type RateFormResult = {
		form?: string;
		error?: string;
		success?: boolean;
		userRating?: UserRating;
		ratingSummary?: RatingSummary;
	} | null;

	type Props = {
		recipeId: string;
		summary: RatingSummary;
		userRating: UserRating | null;
		canRate: boolean;
		isSignedIn: boolean;
		isOwner: boolean;
		form?: RateFormResult;
	};

	let {
		recipeId,
		summary,
		userRating,
		canRate,
		isSignedIn,
		isOwner,
		form = null
	}: Props = $props();

	const fieldId = $props.id();
	/* DOM order high→low + CSS row-reverse = visual 1→5 with fill-on-hover */
	const scores = [5, 4, 3, 2, 1] as const;

	let optimisticSummary = $state<RatingSummary | null>(null);
	let optimisticUserRating = $state<UserRating | null>(null);
	let selectedScore = $state(untrack(() => userRating?.score ?? 0));
	let noteValue = $state(untrack(() => userRating?.note ?? ''));
	let isSaving = $state(false);
	let showSaved = $state(false);
	let savedTimeout: ReturnType<typeof setTimeout> | undefined;

	const displayedSummary = $derived(optimisticSummary ?? summary);
	const displayedUserRating = $derived(optimisticUserRating ?? userRating);

	const summaryText = $derived.by(() => {
		if (displayedSummary.count <= 0 || displayedSummary.average == null) {
			return m.rating_summary_empty();
		}

		return m.rating_summary({
			average: displayedSummary.average.toFixed(1),
			count: displayedSummary.count
		});
	});

	const errorMessage = $derived.by(() => {
		if (form?.form !== 'rate' || !form.error) return null;

		switch (form.error) {
			case 'auth':
				return m.error_auth_required();
			case 'score':
				return m.error_rating_score();
			case 'note':
				return m.error_rating_note();
			case 'owner':
				return m.error_rating_owner();
			case 'not_found':
				return m.error_not_found();
			case 'forbidden':
				return m.error_forbidden();
			default:
				return m.error_generic();
		}
	});

	function applyOptimistic(result: RateFormResult) {
		if (!result || result.form !== 'rate') return;

		if (result.ratingSummary) {
			optimisticSummary = result.ratingSummary;
		}

		if (result.userRating) {
			optimisticUserRating = result.userRating;
			selectedScore = result.userRating.score;
			noteValue = result.userRating.note ?? '';
		}
	}

	function flashSaved() {
		showSaved = true;
		clearTimeout(savedTimeout);
		savedTimeout = setTimeout(() => {
			showSaved = false;
		}, 3000);
	}

	onDestroy(() => {
		clearTimeout(savedTimeout);
	});
</script>

<section class="recipe-rating stack" aria-labelledby="{fieldId}-heading">
	<div class="recipe-rating__header">
		<h2 id="{fieldId}-heading">{m.rating_heading()}</h2>
		<p class="meta rating-summary">{summaryText}</p>
	</div>

	{#if isOwner}
		<p class="meta">{m.rating_owner_blocked()}</p>
	{:else if !isSignedIn && !canRate}
		<p class="meta">
			<a
				href="{resolve(localizeHref('/login') as Pathname)}?redirectTo={encodeURIComponent(
					`/r/${recipeId}`
				)}"
			>
				{m.rating_sign_in()}
			</a>
		</p>
	{:else if canRate}
		{#if displayedUserRating}
			<p class="meta">{m.rating_your_score({ score: displayedUserRating.score })}</p>
		{/if}

		{#if errorMessage}
			<p class="alert">{errorMessage}</p>
		{/if}

		{#if showSaved}
			<p class="alert alert-success" role="status">{m.rating_saved()}</p>
		{/if}

		<form
			class="panel form recipe-rating__form"
			method="POST"
			action="?/rate"
			use:enhance={() => {
				isSaving = true;
				return async ({ result, update }) => {
					try {
						if (result.type === 'success' && result.data?.form === 'rate') {
							applyOptimistic(result.data as RateFormResult);
							if (result.data.success) flashSaved();
						}

						await update();
						optimisticSummary = null;
						optimisticUserRating = null;
					} finally {
						isSaving = false;
					}
				};
			}}
		>
			<fieldset class="rating-fieldset">
				<legend>{m.rating_score_label()}</legend>
				<div class="rating-stars" role="radiogroup" aria-label={m.rating_score_label()}>
					{#each scores as score (score)}
						<input
							id="{fieldId}-score-{score}"
							type="radio"
							name="score"
							value={score}
							bind:group={selectedScore}
							required
							aria-label={m.rating_star({ score })}
						/>
						<label for="{fieldId}-score-{score}" aria-hidden="true">
							<span class="rating-stars__glyph">★</span>
							<span class="rating-stars__number">{score}</span>
						</label>
					{/each}
				</div>
			</fieldset>

			<label>
				{m.rating_note_label()}
				<textarea name="note" maxlength={NOTE_MAX_LENGTH} rows="3" bind:value={noteValue}
				></textarea>
				<span class="meta">{m.rating_note_hint()}</span>
			</label>

			<button class="btn btn-primary" type="submit" disabled={isSaving} aria-busy={isSaving}>
				{#if isSaving}
					<span class="btn__spinner" aria-hidden="true"></span>
					{m.rating_saving()}
				{:else}
					{m.rating_submit()}
				{/if}
			</button>
		</form>
	{/if}
</section>
