<script lang="ts">
	import { onMount } from 'svelte';
	import {
		clearCookingState,
		loadCookingState,
		saveCookingState,
		type CookingSessionState
	} from '$lib/cookingMode';
	import { formatIngredientAmount, type RecipeIngredient } from '$lib/ingredients';
	import * as m from '$lib/paraglide/messages';

	type Props = {
		recipeId: string;
		title: string;
		ingredients: RecipeIngredient[];
		steps: string[];
		onClose: () => void;
	};

	let { recipeId, title, ingredients, steps, onClose }: Props = $props();

	let cookingState = $state<CookingSessionState>({
		checkedIndices: [],
		currentStepIndex: 0,
		completedStepIndices: []
	});
	let isInstructionsFullscreen = $state(false);

	const missingCount = $derived(
		ingredients.filter((_, index) => !cookingState.checkedIndices.includes(index)).length
	);

	function persist() {
		saveCookingState(recipeId, cookingState);
	}

	function toggleIngredient(index: number) {
		const checked = new Set(cookingState.checkedIndices);
		if (checked.has(index)) {
			checked.delete(index);
		} else {
			checked.add(index);
		}
		cookingState = { ...cookingState, checkedIndices: [...checked] };
		persist();
	}

	function onStepNumberClick(index: number) {
		const completed = new Set(cookingState.completedStepIndices);
		if (completed.has(index)) {
			completed.delete(index);
		} else {
			completed.add(index);
		}
		cookingState = {
			...cookingState,
			currentStepIndex: index,
			completedStepIndices: [...completed]
		};
		persist();
	}

	function setCurrentStep(index: number) {
		cookingState = { ...cookingState, currentStepIndex: index };
		persist();
	}

	function exitCooking() {
		onClose();
	}

	function resetProgress() {
		cookingState = {
			checkedIndices: [],
			currentStepIndex: 0,
			completedStepIndices: []
		};
		clearCookingState(recipeId);
	}

	function toggleInstructionsFullscreen() {
		isInstructionsFullscreen = !isInstructionsFullscreen;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || !isInstructionsFullscreen) return;
		isInstructionsFullscreen = false;
	}

	onMount(() => {
		const saved = loadCookingState(recipeId);
		if (saved) cookingState = saved;
	});
</script>

<svelte:window onkeydown={onKeydown} />

<div
	class="cooking-mode"
	class:cooking-mode--instructions-fullscreen={isInstructionsFullscreen}
	role="dialog"
	aria-modal="true"
	aria-label={m.cooking_mode_title()}
>
	<header class="cooking-mode__header">
		<h2>{title}</h2>
		<div class="cooking-mode__header-actions">
			<button class="btn btn-ghost" type="button" onclick={resetProgress}>
				{m.cooking_mode_reset()}
			</button>
			<button class="btn btn-primary" type="button" onclick={exitCooking}>
				{m.cooking_mode_exit()}
			</button>
		</div>
	</header>

	<div class="cooking-mode__grid">
		{#if !isInstructionsFullscreen}
			<section class="cooking-mode__panel">
				<div class="cooking-mode__panel-head">
					<h3>{m.ingredients_heading()}</h3>
					{#if ingredients.length > 0}
						<p class="meta" class:cooking-mode__missing={missingCount > 0}>
							{missingCount > 0
								? m.cooking_mode_missing({ count: missingCount })
								: m.cooking_mode_all_ready()}
						</p>
					{/if}
				</div>

				{#if ingredients.length === 0}
					<p class="meta">{m.cooking_mode_no_ingredients()}</p>
				{:else}
					<ul class="cooking-mode__ingredients">
						{#each ingredients as ingredient, index (index)}
							{@const amount = formatIngredientAmount(ingredient)}
							<li>
								<button
									type="button"
									class="cooking-mode__ingredient"
									class:cooking-mode__ingredient--checked={cookingState.checkedIndices.includes(
										index
									)}
									aria-pressed={cookingState.checkedIndices.includes(index)}
									onclick={() => toggleIngredient(index)}
								>
									<span class="cooking-mode__check" aria-hidden="true"></span>
									<span class="cooking-mode__ingredient-copy">
										<strong>{ingredient.name}</strong>
										{#if amount}
											<span class="meta">{amount}</span>
										{/if}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		<section class="cooking-mode__panel cooking-mode__panel--instructions">
			<div class="cooking-mode__panel-head">
				<h3>{m.cooking_mode_steps_heading()}</h3>
				{#if steps.length > 0}
					<button
						class="btn btn-ghost cooking-mode__fullscreen"
						type="button"
						aria-pressed={isInstructionsFullscreen}
						onclick={toggleInstructionsFullscreen}
					>
						{isInstructionsFullscreen ? m.editor_exit_fullscreen() : m.editor_fullscreen()}
					</button>
				{/if}
			</div>

			{#if steps.length === 0}
				<p class="meta">{m.cooking_mode_no_steps()}</p>
			{:else}
				<ol class="cooking-mode__steps">
					{#each steps as step, index (index)}
						<li>
							<div
								class="cooking-mode__step"
								class:cooking-mode__step--current={cookingState.currentStepIndex === index}
								class:cooking-mode__step--done={cookingState.completedStepIndices.includes(
									index
								)}
							>
								<button
									type="button"
									class="cooking-mode__step-number"
									aria-current={cookingState.currentStepIndex === index ? 'step' : undefined}
									aria-pressed={cookingState.completedStepIndices.includes(index)}
									onclick={() => onStepNumberClick(index)}
								>
									{index + 1}
								</button>
								<button
									type="button"
									class="cooking-mode__step-text"
									onclick={() => setCurrentStep(index)}
								>
									{step}
								</button>
							</div>
						</li>
					{/each}
				</ol>
			{/if}
		</section>
	</div>
</div>
