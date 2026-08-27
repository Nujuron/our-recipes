<script lang="ts">
	import { untrack } from 'svelte';
	import { ALLERGENS, type Allergen } from '$lib/allergens';
	import { allergenLabel } from '$lib/allergenLabels';
	import AllergenIcon from '$lib/components/AllergenIcon.svelte';
	import * as m from '$lib/paraglide/messages';

	type Props = {
		value?: Allergen[] | null;
	};

	let { value = [] }: Props = $props();

	let selected = $state<Allergen[]>(untrack(() => [...(value ?? [])]));
</script>

<fieldset class="allergen-picker">
	<legend>{m.field_allergens()}</legend>
	<div class="allergen-picker__grid">
		{#each ALLERGENS as allergen (allergen)}
			<label class="allergen-chip">
				<input
					class="allergen-chip__input"
					type="checkbox"
					name="allergens"
					value={allergen}
					bind:group={selected}
				/>
				<AllergenIcon {allergen} />
				<span>{allergenLabel(allergen)}</span>
			</label>
		{/each}
	</div>
	<p class="meta">{m.field_allergens_hint()}</p>
</fieldset>
