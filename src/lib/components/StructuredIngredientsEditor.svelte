<script lang="ts">
	import { untrack } from 'svelte';
	import {
		parseIngredientLines,
		parseIngredientsJson,
		type RecipeIngredient
	} from '$lib/ingredients';
	import * as m from '$lib/paraglide/messages';

	type Props = {
		name?: string;
		value?: RecipeIngredient[] | string | null;
	};

	let { name = 'ingredients', value = null }: Props = $props();

	const initialRows = untrack(() => {
		const parsed = parseIngredientsJson(value);
		return parsed.length > 0 ? parsed : [{ name: '', quantity: null, unit: null }];
	});

	let rows = $state<RecipeIngredient[]>(initialRows);
	let showImport = $state(false);
	let importText = $state('');

	const serialized = $derived(JSON.stringify(rows.filter((row) => row.name.trim())));

	function addRow() {
		rows = [...rows, { name: '', quantity: null, unit: null }];
	}

	function removeRow(index: number) {
		if (rows.length <= 1) {
			rows = [{ name: '', quantity: null, unit: null }];
			return;
		}
		rows = rows.filter((_, rowIndex) => rowIndex !== index);
	}

	function updateRow(index: number, field: keyof RecipeIngredient, next: string) {
		rows = rows.map((row, rowIndex) => {
			if (rowIndex !== index) return row;
			if (field === 'name') {
				return { ...row, name: next };
			}
			return {
				...row,
				[field]: next.trim() ? next.trim() : null
			};
		});
	}

	function importLines() {
		const imported = parseIngredientLines(importText);
		if (imported.length === 0) return;

		const existing = rows.filter((row) => row.name.trim());
		rows = [...existing, ...imported];
		importText = '';
		showImport = false;
	}
</script>

<div class="structured-ingredients">
	<input type="hidden" {name} value={serialized} />

	<div class="structured-ingredients__rows">
		<div class="structured-ingredients__header" aria-hidden="true">
			<span>{m.field_ingredient_name()}</span>
			<span>{m.field_ingredient_quantity()}</span>
			<span>{m.field_ingredient_unit()}</span>
			<span></span>
		</div>

		{#each rows as row, index (index)}
			<div class="structured-ingredients__row">
				<input
					type="text"
					placeholder={m.placeholder_ingredient_name()}
					value={row.name}
					oninput={(event) =>
						updateRow(index, 'name', (event.currentTarget as HTMLInputElement).value)}
				/>
				<input
					type="text"
					placeholder={m.placeholder_ingredient_quantity()}
					value={row.quantity ?? ''}
					oninput={(event) =>
						updateRow(index, 'quantity', (event.currentTarget as HTMLInputElement).value)}
				/>
				<input
					type="text"
					placeholder={m.placeholder_ingredient_unit()}
					value={row.unit ?? ''}
					oninput={(event) =>
						updateRow(index, 'unit', (event.currentTarget as HTMLInputElement).value)}
				/>
				<button
					class="btn btn-ghost structured-ingredients__remove"
					type="button"
					aria-label={m.ingredient_remove()}
					onclick={() => removeRow(index)}
				>
					×
				</button>
			</div>
		{/each}
	</div>

	<div class="structured-ingredients__actions">
		<button class="btn btn-ghost" type="button" onclick={addRow}>{m.ingredient_add()}</button>
		<button class="btn btn-ghost" type="button" onclick={() => (showImport = !showImport)}>
			{m.ingredient_import_lines()}
		</button>
	</div>

	{#if showImport}
		<label class="structured-ingredients__import">
			{m.ingredient_import_label()}
			<textarea
				rows="4"
				placeholder={m.placeholder_ingredients()}
				bind:value={importText}
			></textarea>
			<button class="btn btn-ghost" type="button" onclick={importLines} disabled={!importText.trim()}>
				{m.ingredient_import_apply()}
			</button>
		</label>
	{/if}
</div>
