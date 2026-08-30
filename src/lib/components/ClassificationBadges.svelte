<script lang="ts">
	import { courseLabel, effortLabel } from '$lib/classificationLabels';
	import type { RecipeCourse, RecipeEffort } from '$lib/classifications';
	import * as m from '$lib/paraglide/messages';

	type Props = {
		course?: RecipeCourse | null;
		effort?: RecipeEffort | null;
	};

	let { course = null, effort = null }: Props = $props();

	const hasFacets = $derived(Boolean(course || effort));
</script>

{#if hasFacets}
	<ul class="classification-badges" aria-label={m.classifications_heading()}>
		{#if course}
			<li class="classification-badge">{courseLabel(course)}</li>
		{/if}
		{#if effort}
			<li class="classification-badge">{effortLabel(effort)}</li>
		{/if}
	</ul>
{/if}
