<script lang="ts">
	import type { PantryLot } from '$lib/database.types';
	import { PANTRY_LOCATIONS } from '$lib/pantry';
	import { pantryLocationLabel } from '$lib/pantryLabels';
	import * as m from '$lib/paraglide/messages';
	let { lot = null }: { lot?: Partial<PantryLot> | null } = $props();
</script>

<div class="pantry-fields">
	<label
		>{m.pantry_name()}<input name="name" required maxlength="160" value={lot?.name ?? ''} /></label
	>
	<label
		>{m.pantry_quantity()}<input
			name="quantity"
			type="number"
			min="0.000000001"
			max="1000000000000"
			step="any"
			value={lot?.quantity ?? ''}
		/><small>{m.pantry_quantity_hint()}</small></label
	>
	<label>{m.pantry_unit()}<input name="unit" maxlength="40" value={lot?.unit ?? ''} /></label>
	<label
		>{m.pantry_location()}<select name="location" value={lot?.location ?? 'pantry'}
			>{#each PANTRY_LOCATIONS as location (location)}<option value={location}
					>{pantryLocationLabel(location)}</option
				>{/each}</select
		></label
	>
	<label
		>{m.pantry_food_date()}<input
			name="food_date"
			type="date"
			min="0001-01-01"
			max="9999-12-31"
			value={lot?.food_date ?? ''}
		/></label
	>
	<label
		>{m.pantry_date_type()}<select name="date_type" value={lot?.date_type ?? 'use_by'}
			><option value="use_by">{m.pantry_use_by()}</option><option value="best_before"
				>{m.pantry_best_before()}</option
			></select
		></label
	>
	<label class="pantry-fields__wide"
		>{m.pantry_note()}<textarea name="note" maxlength="1000" rows="2">{lot?.note ?? ''}</textarea
		></label
	>
</div>
