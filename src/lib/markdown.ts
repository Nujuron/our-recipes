import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

marked.setOptions({
	gfm: true,
	breaks: true
});

export function renderMarkdown(markdown: string): string {
	const rawHtml = marked.parse(markdown ?? '', { async: false }) as string;
	return DOMPurify.sanitize(rawHtml, {
		USE_PROFILES: { html: true }
	});
}

export function coverPublicUrl(supabaseUrl: string, coverPath: string | null): string | null {
	if (!coverPath) return null;
	return `${supabaseUrl}/storage/v1/object/public/recipe-covers/${coverPath}`;
}
