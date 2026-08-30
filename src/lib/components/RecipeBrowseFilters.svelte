<script lang="ts">
	import { COURSES, EFFORTS, type RecipeCourse, type RecipeEffort } from '$lib/classifications';
	import { courseLabel, effortLabel } from '$lib/classificationLabels';
	import * as m from '$lib/paraglide/messages';

	type Props = {
		course?: RecipeCourse | null;
		effort?: RecipeEffort | null;
	};

	let { course = null, effort = null }: Props = $props();
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
