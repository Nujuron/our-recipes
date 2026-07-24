<script lang="ts">
	import { untrack } from 'svelte';
	import { normalizeSteps, parseStepLines } from '$lib/steps';
	import * as m from '$lib/paraglide/messages';

	type Props = {
		name?: string;
		value?: string | null;
	};

	let { name = 'steps', value = '' }: Props = $props();

	const initialRows = untrack(() => parseStepLines(value ?? ''));

	let rows = $state<string[]>(initialRows);
	let showImport = $state(false);
	let importText = $state('');
	let isFullscreen = $state(false);

	const serialized = $derived(normalizeSteps(rows.join('\n')) ?? '');

	function addRow() {
		rows = [...rows, ''];
	}

	function removeRow(index: number) {
		rows = rows.filter((_, rowIndex) => rowIndex !== index);
	}

	function updateRow(index: number, next: string) {
		rows = rows.map((row, rowIndex) => (rowIndex === index ? next : row));
	}

	function importLines() {
		const imported = parseStepLines(importText);
		if (imported.length === 0) return;

		const existing = rows.map((row) => row.trim()).filter(Boolean);
		rows = [...existing, ...imported];
		importText = '';
		showImport = false;
	}

	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isFullscreen) {
			isFullscreen = false;
		}
	}

	$effect(() => {
		if (!isFullscreen) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

<div class="structured-steps" class:structured-steps--fullscreen={isFullscreen}>
	<input type="hidden" {name} value={serialized} />

	<div class="structured-steps__label-row">
		<span class="structured-steps__label">{m.field_steps()}</span>
		<button
			class="btn btn-ghost structured-steps__fullscreen"
			type="button"
			aria-pressed={isFullscreen}
			onclick={toggleFullscreen}
		>
			{isFullscreen ? m.editor_exit_fullscreen() : m.editor_fullscreen()}
		</button>
	</div>

	<div class="structured-steps__shell">
		{#if rows.length > 0}
			<ol class="structured-steps__rows">
				{#each rows as row, index (index)}
					<li class="structured-steps__row">
						<span class="structured-steps__number" aria-hidden="true">{index + 1}</span>
						<textarea
							rows="2"
							placeholder={m.placeholder_step()}
							value={row}
							oninput={(event) =>
								updateRow(index, (event.currentTarget as HTMLTextAreaElement).value)}
						></textarea>
						<button
							class="btn btn-ghost structured-steps__remove"
							type="button"
							aria-label={m.step_remove()}
							onclick={() => removeRow(index)}
						>
							×
						</button>
					</li>
				{/each}
			</ol>
		{/if}

		<div class="structured-steps__actions">
			<button class="btn btn-ghost" type="button" onclick={addRow}>{m.step_add()}</button>
			{#if rows.length > 0}
				<button class="btn btn-ghost" type="button" onclick={() => (showImport = !showImport)}>
					{m.step_import_lines()}
				</button>
			{/if}
		</div>

		{#if showImport}
			<label class="structured-steps__import">
				{m.step_import_label()}
				<textarea rows="4" placeholder={m.placeholder_steps()} bind:value={importText}></textarea>
				<button
					class="btn btn-ghost"
					type="button"
					onclick={importLines}
					disabled={!importText.trim()}
				>
					{m.step_import_apply()}
				</button>
			</label>
		{/if}
	</div>
</div>
