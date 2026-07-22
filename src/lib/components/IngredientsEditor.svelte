<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';
	import { Markdown } from '@tiptap/markdown';
	import { PasteMarkdown } from '$lib/editor/pasteMarkdown';
	import { ingredientsFromMarkdown, ingredientsToMarkdown, parseIngredientLines } from '$lib/ingredients';

	type Props = {
		name?: string;
		value?: string;
		placeholder?: string;
	};

	let { name = 'ingredients', value = '', placeholder = '' }: Props = $props();

	let element: HTMLDivElement | undefined = $state();
	let serialized = $state(untrack(() => parseIngredientLines(value).join('\n')));

	const placeholderText = $derived.by(() => {
		const options = placeholder
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean);
		return options.find((line) => !/^e\.g\.?$/i.test(line)) ?? options[0] ?? '';
	});

	function syncSerialized(editor: Editor) {
		serialized = ingredientsFromMarkdown(editor.getMarkdown());
	}

	const initialContent = untrack(() => ingredientsToMarkdown(value));

	onMount(() => {
		if (!element) return;

		const instance = new Editor({
			element,
			extensions: [
				StarterKit.configure({
					heading: false,
					blockquote: false,
					codeBlock: false,
					code: false,
					horizontalRule: false,
					orderedList: false,
					strike: false,
					bold: false,
					italic: false
				}),
				Markdown.configure({
					markedOptions: {
						gfm: true,
						breaks: true
					}
				}),
				Placeholder.configure({
					placeholder: placeholderText,
					emptyEditorClass: 'is-editor-empty'
				}),
				PasteMarkdown
			],
			content: initialContent || '- ',
			contentType: 'markdown',
			editorProps: {
				attributes: {
					class: 'ingredients-editor__surface'
				}
			},
			onCreate: ({ editor }) => {
				if (!editor.isActive('bulletList')) {
					editor.commands.toggleBulletList();
				}
			},
			onUpdate: ({ editor }) => {
				syncSerialized(editor);
			}
		});

		syncSerialized(instance);

		return () => {
			instance.destroy();
		};
	});
</script>

<div class="ingredients-editor">
	<input type="hidden" {name} value={serialized} />
	<div class="ingredients-editor__shell">
		<div class="ingredients-editor__content" bind:this={element}></div>
	</div>
</div>
