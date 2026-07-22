<script lang="ts">
	type Props = {
		name: string | null | undefined;
		label: string;
	};

	let { name, label }: Props = $props();

	const initial = $derived.by(() => {
		const trimmed = name?.trim();
		if (!trimmed) return '?';
		return trimmed.charAt(0).toLocaleUpperCase();
	});
</script>

<span class="user-avatar" aria-hidden="true" title={label}>{initial}</span>
