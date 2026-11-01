<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { getShoppingCart } from '$lib/shoppingList.svelte';
	import { parseQuantityNumber } from '$lib/ingredients';
	import { PANTRY_LOCATIONS, parseLotInput } from '$lib/pantry';
	import { pantryLocationLabel } from '$lib/pantryLabels';
	import {
		pantryImportStorageKey,
		persistPantryImport,
		shoppingSnapshot,
		type ImportLot,
		type PantryImport
	} from '$lib/pantryImport';
	import * as m from '$lib/paraglide/messages';

	const cart = getShoppingCart();
	let pantries = $state<{ id: string; name: string }[]>([]);
	let draft = $state<PantryImport | null>(null);
	let pending = $state(false);
	let locked = $state(false);
	let error = $state('');
	let success = $state(false);
	const endpoint = () => resolve(localizeHref('/pantry/import') as Pathname);

	onMount(() => {
		const userId = page.data.user?.id;
		if (!userId) return;
		try {
			const saved = localStorage.getItem(pantryImportStorageKey(userId));
			if (saved) {
				const value = JSON.parse(saved);
				if (value.userId === userId && Array.isArray(value.lines)) {
					draft = value;
					locked = true;
				}
			}
		} catch {
			error = 'storage';
		}
	});

	async function start() {
		pending = true;
		error = '';
		success = false;
		try {
			const result = await fetch(endpoint(), { cache: 'no-store' });
			if (!result.ok) throw new Error();
			const data = await result.json();
			pantries = data.pantries;
			if (!draft)
				draft = {
					userId: data.userId,
					operationId: crypto.randomUUID(),
					pantryId: pantries[0]?.id ?? '',
					lines: cart.items
						.filter((item) => item.checked)
						.slice(0, 100)
						.map((item) => ({
							lineId: item.id,
							snapshot: shoppingSnapshot(item),
							lots: [
								{
									id: crypto.randomUUID(),
									name: item.name,
									quantity: parseQuantityNumber(item.quantity ?? ''),
									unit: item.unit,
									location: 'pantry',
									food_date: null,
									date_type: null,
									note: null
								}
							]
						}))
				};
		} catch {
			error = 'network';
		} finally {
			pending = false;
		}
	}

	function split(lineIndex: number) {
		if (!draft) return;
		const lots = draft.lines[lineIndex].lots;
		if (lots.length >= 20) return;
		// Do not guess how a quantity is distributed between purchases.
		lots.push({ ...lots[0], id: crypto.randomUUID(), quantity: null });
		lots[0].quantity = null;
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!draft || pending) return;
		error = '';
		success = false;
		if (!locked) {
			for (const line of draft.lines) {
				for (let i = 0; i < line.lots.length; i++) {
					const raw = line.lots[i];
					const lot = parseLotInput({ ...raw, date_type: raw.food_date ? raw.date_type : null });
					if (!lot) {
						error = 'invalid';
						return;
					}
					line.lots[i] = { ...lot, id: raw.id };
				}
			}
			if (!draft.lines.length || !persistPantryImport(localStorage, draft)) {
				error = 'storage';
				return;
			}
			locked = true;
		}
		pending = true;
		try {
			const result = await fetch(endpoint(), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(draft)
			});
			if (!result.ok) throw new Error();
			const data = await result.json();
			if (!Array.isArray(data.saved) || !Array.isArray(data.failed)) throw new Error();
			// Save the cart first. If either local write fails, retain the immutable retry record.
			cart.acceptPantryImport(draft.lines, data.saved);
			if (data.failed.length) {
				error = 'partial';
				return;
			}
			localStorage.removeItem(pantryImportStorageKey(draft.userId));
			draft = null;
			locked = false;
			success = true;
		} catch {
			error = 'network';
		} finally {
			pending = false;
		}
	}

	function changeDateType(lot: ImportLot, date: string) {
		if (date && !lot.date_type) lot.date_type = 'use_by';
	}
</script>

{#if page.data.user && (cart.items.some((item) => item.checked) || draft)}
	<section class="panel stack pantry-import">
		<h2>{m.pantry_import_title()}</h2>
		{#if error}<p class="alert" role="alert">
				{error === 'storage'
					? m.pantry_import_storage_error()
					: error === 'partial'
						? m.pantry_import_partial()
						: error === 'invalid'
							? m.pantry_invalid()
							: m.pantry_import_network_error()}
			</p>{/if}
		{#if locked && draft}
			<p class="meta">{m.pantry_import_resume()}</p>
			<form onsubmit={save}>
				<button class="btn btn-primary" disabled={pending}>{m.pantry_import_retry()}</button>
			</form>
		{:else if draft}
			{#if pantries.length === 0}<p class="meta">{m.pantry_import_create_first()}</p>
				<a href={resolve(localizeHref('/pantry') as Pathname)}>{m.pantry_title()}</a>
			{:else}
				<form onsubmit={save} class="stack">
					<label
						>{m.pantry_choose()}<select bind:value={draft.pantryId} required
							>{#each pantries as pantry (pantry.id)}<option value={pantry.id}>{pantry.name}</option
								>{/each}</select
						></label
					>
					{#each draft.lines as line, lineIndex (line.lineId)}
						<fieldset class="stack">
							<legend>{line.lots[0].name}</legend>
							{#each line.lots as lot (lot.id)}
								<div class="pantry-fields">
									<label
										>{m.pantry_name()}<input
											bind:value={lot.name}
											required
											maxlength="160"
										/></label
									>
									<label
										>{m.pantry_quantity()}<input
											type="number"
											bind:value={lot.quantity}
											min="0.000000001"
											max="1000000000000"
											step="any"
										/></label
									>
									<label>{m.pantry_unit()}<input bind:value={lot.unit} maxlength="40" /></label>
									<label
										>{m.pantry_location()}<select bind:value={lot.location}
											>{#each PANTRY_LOCATIONS as location (location)}<option value={location}
													>{pantryLocationLabel(location)}</option
												>{/each}</select
										></label
									>
									<label
										>{m.pantry_food_date()}<input
											type="date"
											bind:value={lot.food_date}
											onchange={(event) => changeDateType(lot, event.currentTarget.value)}
											min="0001-01-01"
											max="9999-12-31"
										/></label
									>
									<label
										>{m.pantry_date_type()}<select
											bind:value={lot.date_type}
											required={Boolean(lot.food_date)}
											><option value={null}>{m.pantry_date_undated()}</option><option value="use_by"
												>{m.pantry_use_by()}</option
											><option value="best_before">{m.pantry_best_before()}</option></select
										></label
									>
								</div>
							{/each}
							<p class="meta">{m.pantry_import_split_hint()}</p>
							<div class="form-row">
								<button
									class="btn btn-ghost"
									type="button"
									disabled={line.lots.length >= 20}
									onclick={() => split(lineIndex)}>{m.pantry_import_split()}</button
								><button
									class="btn btn-ghost"
									type="button"
									onclick={() => {
										if (draft) draft.lines = draft.lines.filter((l) => l.lineId !== line.lineId);
									}}>{m.pantry_import_exclude()}</button
								>
							</div>
						</fieldset>
					{/each}
					<div class="form-row">
						<button class="btn btn-primary" disabled={!draft.lines.length || pending}
							>{m.pantry_import_save()}</button
						><button
							class="btn btn-ghost"
							type="button"
							onclick={() => {
								draft = null;
							}}>{m.action_cancel()}</button
						>
					</div>
				</form>
			{/if}
		{:else}<button class="btn btn-primary" type="button" onclick={start} disabled={pending}
				>{m.pantry_import_title()}</button
			>{/if}
	</section>
{/if}
{#if success}<p class="meta" role="status">{m.pantry_import_success()}</p>{/if}
