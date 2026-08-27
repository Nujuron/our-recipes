<script lang="ts">
	import type { Allergen } from '$lib/allergens';
	import { allergenLabel } from '$lib/allergenLabels';
	import AllergenIcon from '$lib/components/AllergenIcon.svelte';
	import * as m from '$lib/paraglide/messages';

	type Props = {
		allergens: Allergen[];
		compact?: boolean;
	};

	let { allergens, compact = false }: Props = $props();
</script>

{#if allergens.length > 0}
	<ul
		class={['allergen-badges', compact && 'allergen-badges--compact']}
		aria-label={m.allergens_heading()}
	>
		{#each allergens as allergen (allergen)}
			<li class="allergen-badge" title={allergenLabel(allergen)}>
				<AllergenIcon {allergen} size={compact ? 16 : 18} />
				{#if compact}
					<span class="visually-hidden">{allergenLabel(allergen)}</span>
				{:else}
					<span>{allergenLabel(allergen)}</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
