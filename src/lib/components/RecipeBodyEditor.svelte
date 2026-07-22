<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';
	import { Markdown } from '@tiptap/markdown';
	import { PasteMarkdown } from '$lib/editor/pasteMarkdown';
	import * as m from '$lib/paraglide/messages';

	type Props = {
		value?: string;
		placeholder?: string;
	};

	let { value = '', placeholder = '' }: Props = $props();

	let element: HTMLDivElement | undefined = $state();
	let editor = $state<Editor | null>(null);
	let markdown = $state(untrack(() => value));
	let isFullscreen = $state(false);
	let toolbarTick = $state(0);

	function syncMarkdown(next: string) {
		markdown = next;
	}

	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
	}

	$effect(() => {
		if (!isFullscreen) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	});

	function runCommand(action: (instance: Editor) => void) {
		if (!editor) return;
		action(editor);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isFullscreen) {
			isFullscreen = false;
		}
	}

	onMount(() => {
		if (!element) return;

		const instance = new Editor({
			element,
			extensions: [
				StarterKit,
				Markdown.configure({
					markedOptions: {
						gfm: true,
						breaks: true
					}
				}),
				Placeholder.configure({
					placeholder
				}),
				PasteMarkdown
			],
			content: value,
			contentType: 'markdown',
			editorProps: {
				attributes: {
					class: 'markdown-body recipe-body-editor__surface'
				}
			},
			onUpdate: ({ editor: current }) => {
				syncMarkdown(current.getMarkdown());
			},
			onTransaction: ({ editor: current }) => {
				editor = current;
				toolbarTick += 1;
			}
		});

		editor = instance;
		syncMarkdown(instance.getMarkdown());

		return () => {
			instance.destroy();
			editor = null;
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

<div class="recipe-body-editor" class:recipe-body-editor--fullscreen={isFullscreen}>
	<input type="hidden" name="body_md" required value={markdown} />

	<div class="recipe-body-editor__label-row">
		<span class="recipe-body-editor__label">{m.field_body()}</span>
		<button
			class="btn btn-ghost recipe-body-editor__fullscreen"
			type="button"
			aria-pressed={isFullscreen}
			onclick={toggleFullscreen}
		>
			{isFullscreen ? m.editor_exit_fullscreen() : m.editor_fullscreen()}
		</button>
	</div>

	<div class="recipe-body-editor__shell">
		{#if editor}
			<div class="recipe-body-editor__toolbar" aria-label={m.editor_toolbar()}>
				<button
					class="recipe-body-editor__tool"
					class:recipe-body-editor__tool--active={toolbarTick >= 0 && editor.isActive('heading', { level: 2 })}
					type="button"
					title={m.editor_heading()}
					onclick={() => runCommand((instance) => instance.chain().focus().toggleHeading({ level: 2 }).run())}
				>
					{m.editor_heading()}
				</button>
				<button
					class="recipe-body-editor__tool"
					class:recipe-body-editor__tool--active={toolbarTick >= 0 && editor.isActive('bold')}
					type="button"
					title={m.editor_bold()}
					onclick={() => runCommand((instance) => instance.chain().focus().toggleBold().run())}
				>
					{m.editor_bold()}
				</button>
				<button
					class="recipe-body-editor__tool"
					class:recipe-body-editor__tool--active={toolbarTick >= 0 && editor.isActive('italic')}
					type="button"
					title={m.editor_italic()}
					onclick={() => runCommand((instance) => instance.chain().focus().toggleItalic().run())}
				>
					{m.editor_italic()}
				</button>
				<button
					class="recipe-body-editor__tool"
					class:recipe-body-editor__tool--active={toolbarTick >= 0 && editor.isActive('bulletList')}
					type="button"
					title={m.editor_bullet_list()}
					onclick={() => runCommand((instance) => instance.chain().focus().toggleBulletList().run())}
				>
					{m.editor_bullet_list()}
				</button>
				<button
					class="recipe-body-editor__tool"
					class:recipe-body-editor__tool--active={toolbarTick >= 0 && editor.isActive('orderedList')}
					type="button"
					title={m.editor_ordered_list()}
					onclick={() => runCommand((instance) => instance.chain().focus().toggleOrderedList().run())}
				>
					{m.editor_ordered_list()}
				</button>
				<button
					class="recipe-body-editor__tool"
					class:recipe-body-editor__tool--active={toolbarTick >= 0 && editor.isActive('blockquote')}
					type="button"
					title={m.editor_blockquote()}
					onclick={() => runCommand((instance) => instance.chain().focus().toggleBlockquote().run())}
				>
					{m.editor_blockquote()}
				</button>
				<span class="recipe-body-editor__toolbar-spacer" aria-hidden="true"></span>
				<button
					class="recipe-body-editor__tool"
					type="button"
					title={m.editor_undo()}
					disabled={toolbarTick >= 0 && !editor.can().undo()}
					onclick={() => runCommand((instance) => instance.chain().focus().undo().run())}
				>
					{m.editor_undo()}
				</button>
				<button
					class="recipe-body-editor__tool"
					type="button"
					title={m.editor_redo()}
					disabled={toolbarTick >= 0 && !editor.can().redo()}
					onclick={() => runCommand((instance) => instance.chain().focus().redo().run())}
				>
					{m.editor_redo()}
				</button>
			</div>
		{/if}

		<div class="recipe-body-editor__content" bind:this={element}></div>
	</div>
</div>
