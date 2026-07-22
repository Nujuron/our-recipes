import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';

function looksLikeMarkdown(text: string): boolean {
	return (
		/^#{1,6}\s/m.test(text) ||
		/\*\*[^*]+\*\*/.test(text) ||
		/\[.+\]\(.+\)/.test(text) ||
		/^[-*+]\s/m.test(text) ||
		/^\d+\.\s/m.test(text)
	);
}

export const PasteMarkdown = Extension.create({
	name: 'pasteMarkdown',

	addProseMirrorPlugins() {
		const { editor } = this;

		return [
			new Plugin({
				props: {
					handlePaste(_view, event) {
						const text = event.clipboardData?.getData('text/plain');

						if (!text || !editor.markdown || !looksLikeMarkdown(text)) {
							return false;
						}

						event.preventDefault();
						const json = editor.markdown.parse(text);
						editor.commands.insertContent(json);
						return true;
					}
				}
			})
		];
	}
});
