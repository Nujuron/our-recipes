import { Marked, type RendererObject, type Tokens } from 'marked';

function escapeAttr(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

/** Allow only http(s), mailto, fragments, and same-origin-relative paths. */
function sanitizeUrl(url: string | undefined): string | null {
	if (!url) return null;
	const trimmed = url.trim();
	if (!trimmed) return null;
	if (trimmed.startsWith('#') || trimmed.startsWith('/')) return trimmed;
	if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
	return null;
}

const renderer: RendererObject = {
	html() {
		return '';
	},
	link({ href, title, tokens }: Tokens.Link) {
		const safeHref = sanitizeUrl(href);
		const text = this.parser.parseInline(tokens);
		if (!safeHref) return text;
		const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
		return `<a href="${escapeAttr(safeHref)}"${titleAttr} rel="noopener noreferrer">${text}</a>`;
	},
	image({ href, title, text }: Tokens.Image) {
		const safeHref = sanitizeUrl(href);
		if (!safeHref) return '';
		const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
		return `<img src="${escapeAttr(safeHref)}" alt="${escapeAttr(text)}"${titleAttr} />`;
	}
};

const marked = new Marked({
	gfm: true,
	breaks: true,
	renderer
});

export function renderMarkdown(markdown: string): string {
	return marked.parse(markdown ?? '', { async: false }) as string;
}
