<script lang="ts">
	import { untrack } from 'svelte';
	import { COURSES, EFFORTS, type RecipeCourse, type RecipeEffort } from '$lib/classifications';
	import { courseLabel, effortLabel } from '$lib/classificationLabels';
	import { ALLERGENS, type Allergen } from '$lib/allergens';
	import { allergenLabel } from '$lib/allergenLabels';
	import AllergenIcon from '$lib/components/AllergenIcon.svelte';
	import * as m from '$lib/paraglide/messages';

	type Props = {
		course?: RecipeCourse | null;
		effort?: RecipeEffort | null;
		excludeAllergens?: Allergen[];
	};

	let { course = null, effort = null, excludeAllergens = [] }: Props = $props();

	let selected = $state<Allergen[]>(untrack(() => [...excludeAllergens]));
</script>

<label class="recipe-filter">
	<span class="visually-hidden">{m.filter_course()}</span>
	<select name="course" value={course ?? ''}>
		<option value="">{m.filter_all()} · {m.filter_course()}</option>
		{#each COURSES as item (item)}
			<option value={item}>{courseLabel(item)}</option>
		{/each}
	</select>
</label>

<label class="recipe-filter">
	<span class="visually-hidden">{m.filter_effort()}</span>
	<select name="effort" value={effort ?? ''}>
		<option value="">{m.filter_all()} · {m.filter_effort()}</option>
		{#each EFFORTS as item (item)}
			<option value={item}>{effortLabel(item)}</option>
		{/each}
	</select>
</label>

<fieldset class="recipe-filter-allergens">
	<legend>{m.filter_exclude_allergens()}</legend>
	<div class="recipe-filter-allergens__grid">
		{#each ALLERGENS as allergen (allergen)}
			<label class="allergen-chip">
				<input
					class="visually-hidden"
					type="checkbox"
					name="exclude"
					value={allergen}
					bind:group={selected}
				/>
				<AllergenIcon {allergen} size={16} />
				<span>{allergenLabel(allergen)}</span>
			</label>
		{/each}
	</div>
	<p class="meta">{m.filter_exclude_allergens_hint()}</p>
</fieldset>
