<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import type { loadPantryOverview } from '$lib/server/pantry';
	import {
		PANTRY_DATE_STATES,
		type PantryDateState,
		PANTRY_LOCATIONS,
		normalizePantryName,
		pantryCounts,
		pantryToday,
		pantryDateState,
		sortPantryLots
	} from '$lib/pantry';
	import {
		pantryDateStateLabel,
		pantryDateTypeLabel,
		pantryLocationLabel
	} from '$lib/pantryLabels';
	import PantryLotFields from '$lib/components/PantryLotFields.svelte';
	import * as m from '$lib/paraglide/messages';

	let {
		inventory,
		form,
		initialDateFilter = ''
	}: {
		inventory: Awaited<ReturnType<typeof loadPantryOverview>>;
		form?: { error?: string; saved?: boolean } | null;
		initialDateFilter?: PantryDateState | '';
	} = $props();
	let now = $state(new Date());
	let timezone = $state('UTC');
	let createPersonalForm = $state<HTMLFormElement>();
	let search = $state('');
	let location = $state('');
	let dateStateFilter = $derived<string>(initialDateFilter);
	let status = $state('active');
	const pantry = $derived(inventory.pantry);
	const today = $derived(pantry ? pantryToday(pantry.timezone, now) : '');
	const counts = $derived(pantry ? pantryCounts(inventory.lots, pantry, now) : { due: 0, past: 0 });
	const visible = $derived(
		sortPantryLots(
			inventory.lots.filter(
				(lot) =>
					lot.status === status &&
					(!location || lot.location === location) &&
					(!dateStateFilter ||
						pantryDateState(lot.food_date, today, pantry?.warning_days ?? 3) === dateStateFilter) &&
					normalizePantryName(lot.name).includes(normalizePantryName(search))
			)
		)
	);
	const createFamilies = $derived(
		inventory.families.filter(
			(family) => !inventory.pantries.some((p) => p.family_id === family.id)
		)
	);
	const href = (path: string) => resolve(localizeHref(path) as Pathname);

	onMount(() => {
		timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const refresh = () => {
			now = new Date();
		};
		const timer = setInterval(refresh, 30_000);
		document.addEventListener('visibilitychange', refresh);
		if (!inventory.hasPersonal) void tick().then(() => createPersonalForm?.requestSubmit());
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', refresh);
		};
	});
</script>

<div class="pantry-dashboard stack">
	{#if form?.error}
		<p class="alert" role="alert">
			{form.error === 'conflict'
				? m.pantry_conflict()
				: form.error === 'invalid'
					? m.pantry_invalid()
					: m.error_generic()}
		</p>
		{#if form.error === 'conflict'}<a
				class="btn btn-ghost"
				href={href(`/pantry?pantry=${pantry?.id ?? ''}`)}
				data-sveltekit-reload>{m.pantry_reload()}</a
			>{/if}
	{:else if form?.saved}<p class="meta" role="status">{m.pantry_saved()}</p>{/if}

	{#if !inventory.hasPersonal}
		<form
			method="POST"
			action="?/create"
			use:enhance
			bind:this={createPersonalForm}
			class="panel stack"
		>
			<input type="hidden" name="name" value={m.pantry_personal()} /><input
				type="hidden"
				name="timezone"
				value={timezone}
			/>
			<button class="btn btn-primary">{m.pantry_create_personal()}</button>
		</form>
	{/if}

	{#if inventory.pantries.length > 0}
		<form method="GET" class="form-row">
			<label
				>{m.pantry_choose()}<select name="pantry" value={pantry?.id}
					>{#each inventory.pantries as item (item.id)}<option value={item.id}
							>{item.name}{item.family_id ? ` · ${m.pantry_shared()}` : ''}</option
						>{/each}</select
				></label
			>
			<button class="btn btn-ghost">{m.pantry_open()}</button>
		</form>
	{/if}

	{#if pantry}
		<div class="panel stack">
			<h2>{pantry.name}</h2>
			<div class="form-row">
				<span>{m.pantry_due_count({ count: counts.due })}</span><span class="pantry-past"
					>{m.pantry_past_count({ count: counts.past })}</span
				>
			</div>
			<p class="meta">{m.pantry_date_hint()}</p>
			<a class="btn btn-primary" href={href(`/pantry/recipes?pantry=${pantry.id}`)}
				>{m.pantry_use_soon()}</a
			>
		</div>

		<details class="panel">
			<summary>{m.pantry_add()}</summary>
			<form method="POST" action="?/save" use:enhance class="stack pantry-details">
				<input type="hidden" name="pantry_id" value={pantry.id} /><PantryLotFields /><button
					class="btn btn-primary">{m.pantry_save()}</button
				>
			</form>
		</details>

		<div class="pantry-fields">
			<label>{m.pantry_search()}<input type="search" bind:value={search} /></label>
			<label
				>{m.pantry_location()}<select bind:value={location}
					><option value="">{m.filter_all()}</option>{#each PANTRY_LOCATIONS as item (item)}<option
							value={item}>{pantryLocationLabel(item)}</option
						>{/each}</select
				></label
			>
			<label
				>{m.pantry_food_date()}<select bind:value={dateStateFilter}
					><option value="">{m.filter_all()}</option
					>{#each PANTRY_DATE_STATES as item (item)}<option value={item}
							>{pantryDateStateLabel(item)}</option
						>{/each}</select
				></label
			>
			<label
				>{m.pantry_status()}<select bind:value={status}
					><option value="active">{m.pantry_active()}</option><option value="finished"
						>{m.pantry_finished()}</option
					><option value="discarded">{m.pantry_discarded()}</option></select
				></label
			>
		</div>
		<ul class="pantry-list">
			{#each visible as lot (lot.id)}
				{@const dateState = pantryDateState(lot.food_date, today, pantry.warning_days)}
				<li class="panel stack">
					<div class="form-row" style="justify-content: space-between">
						<h3>{lot.name}</h3>
						<span class="meta">{pantryLocationLabel(lot.location)}</span>
					</div>
					<p>{lot.quantity ?? m.pantry_unknown()}{lot.unit ? ` ${lot.unit}` : ''}</p>
					<p class:pantry-past={dateState === 'past'}>
						{lot.food_date
							? `${pantryDateTypeLabel(lot.date_type)}: ${lot.food_date} · `
							: ''}{pantryDateStateLabel(dateState)}
					</p>
					{#if lot.note}<p class="meta">{lot.note}</p>{/if}
					<a
						href={href(
							`/pantry/recipes?pantry=${pantry.id}&ingredient=${encodeURIComponent(lot.name)}`
						)}>{m.pantry_recipes_for()}</a
					>
					{#if lot.status === 'active'}
						{#if !lot.food_date}
							<details open={dateStateFilter === 'undated'}>
								<summary>{m.pantry_complete_date()}</summary>
								<form method="POST" action="?/date" use:enhance class="stack pantry-details">
									<input type="hidden" name="id" value={lot.id} />
									<input type="hidden" name="version" value={lot.version} />
									<label
										>{m.pantry_food_date()}<input
											type="date"
											name="food_date"
											min="0001-01-01"
											max="9999-12-31"
											required
										/></label
									>
									<label
										>{m.pantry_date_type()}<select name="date_type"
											><option value="use_by">{m.pantry_use_by()}</option><option
												value="best_before">{m.pantry_best_before()}</option
											></select
										></label
									>
									<button class="btn btn-primary">{m.pantry_save_date()}</button>
								</form>
							</details>
						{/if}
						<details>
							<summary>{m.pantry_edit()}</summary>
							<form method="POST" action="?/save" use:enhance class="stack pantry-details">
								<input type="hidden" name="id" value={lot.id} /><input
									type="hidden"
									name="version"
									value={lot.version}
								/><input type="hidden" name="pantry_id" value={pantry.id} /><PantryLotFields
									{lot}
								/><button class="btn btn-primary">{m.pantry_save()}</button>
							</form>
						</details>
						{#if lot.quantity !== null}
							<form method="POST" action="?/consume" use:enhance class="form-row">
								<input type="hidden" name="id" value={lot.id} /><input
									type="hidden"
									name="version"
									value={lot.version}
								/><label
									>{m.pantry_consume_amount()}<input
										name="amount"
										type="number"
										min="0.000000001"
										max={lot.quantity}
										step="any"
										required
									/></label
								><button class="btn btn-ghost">{m.pantry_consume()}</button>
							</form>
						{:else}<p class="meta">{m.pantry_unknown_consume()}</p>{/if}
						<form method="POST" action="?/close" use:enhance class="form-row">
							<input type="hidden" name="id" value={lot.id} /><input
								type="hidden"
								name="version"
								value={lot.version}
							/><button class="btn btn-ghost" name="status" value="finished"
								>{m.pantry_finish()}</button
							><button class="btn btn-ghost" name="status" value="discarded"
								>{m.pantry_discard()}</button
							>
						</form>
					{/if}
				</li>
			{:else}<li class="empty">{m.pantry_empty()}</li>{/each}
		</ul>
		{#key pantry.id + ':' + pantry.version}
			<details class="panel">
				<summary>{m.pantry_settings()}</summary>
				<form method="POST" action="?/settings" use:enhance class="stack pantry-details">
					<input type="hidden" name="id" value={pantry.id} /><input
						type="hidden"
						name="version"
						value={pantry.version}
					/><label
						>{m.pantry_name()}<input
							name="name"
							value={pantry.name}
							required
							maxlength="80"
						/></label
					><label
						>{m.pantry_timezone()}<input
							name="timezone"
							value={pantry.timezone}
							required
							maxlength="100"
						/></label
					><label
						>{m.pantry_warning_days()}<input
							name="warning_days"
							type="number"
							min="0"
							max="30"
							value={pantry.warning_days}
							required
						/></label
					><button class="btn btn-primary">{m.pantry_save()}</button>
				</form>
			</details>
		{/key}
	{/if}

	{#if createFamilies.length > 0}
		<details class="panel">
			<summary>{m.pantry_create_shared()}</summary>
			<form method="POST" action="?/create" use:enhance class="stack pantry-details">
				<input type="hidden" name="timezone" value={timezone} /><label
					>{m.pantry_name()}<input name="name" required maxlength="80" /></label
				><label
					>{m.nav_families()}<select name="family_id" required
						>{#each createFamilies as family (family.id)}<option value={family.id}
								>{family.name}</option
							>{/each}</select
					></label
				>
				<p class="meta">{m.pantry_family_delete_hint()}</p>
				<button class="btn btn-primary">{m.pantry_create_shared()}</button>
			</form>
		</details>
	{/if}
</div>
