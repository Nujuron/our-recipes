const BULLET_PREFIX = /^[-*•]\s+/;
const ORDERED_PREFIX = /^\d+\.\s+/;

export function parseStepLines(steps: string | null | undefined): string[] {
	if (!steps) return [];

	return steps
		.split(/\r?\n/)
		.map((line) => line.replace(ORDERED_PREFIX, '').replace(BULLET_PREFIX, '').trim())
		.filter(Boolean);
}

/** Serialize optional steps for storage; empty becomes null. */
export function normalizeSteps(raw: string): string | null {
	const lines = parseStepLines(raw);
	return lines.length > 0 ? lines.join('\n') : null;
}

function deriveFromHeadings(bodyMd: string, level: number): string[] {
	const prefix = '#'.repeat(level);
	const sections: string[] = [];
	let current = '';

	for (const line of bodyMd.split(/\r?\n/)) {
		const isHeading =
			line.startsWith(`${prefix} `) && !line.startsWith(`${'#'.repeat(level + 1)} `);

		if (isHeading) {
			if (current.trim()) sections.push(current.trim());
			current = `${line.slice(level + 1).trim()}\n`;
			continue;
		}

		if (current) current += `${line}\n`;
	}

	if (current.trim()) sections.push(current.trim());
	return sections.filter(Boolean);
}

function deriveOrderedListSteps(bodyMd: string): string[] {
	const steps: string[] = [];
	let inList = false;

	for (const line of bodyMd.split(/\r?\n/)) {
		const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
		if (orderedMatch) {
			steps.push(orderedMatch[1].trim());
			inList = true;
			continue;
		}

		if (inList && line.trim() === '') {
			inList = false;
			continue;
		}

		if (inList && steps.length > 0 && /^\s{2,}/.test(line)) {
			steps[steps.length - 1] = `${steps[steps.length - 1]} ${line.trim()}`;
		}
	}

	return steps.filter(Boolean);
}

function deriveParagraphSteps(bodyMd: string): string[] {
	return bodyMd
		.split(/\n\s*\n/)
		.map((block) =>
			block
				.split(/\r?\n/)
				.filter((line) => !line.trim().startsWith('#'))
				.join(' ')
				.trim()
		)
		.filter(Boolean);
}

/** Best-effort step extraction from markdown body. */
export function deriveStepsFromBody(bodyMd: string): string[] {
	if (!bodyMd.trim()) return [];

	const ordered = deriveOrderedListSteps(bodyMd);
	if (ordered.length > 0) return ordered;

	const headings = deriveFromHeadings(bodyMd, 2);
	if (headings.length > 0) return headings;

	return deriveParagraphSteps(bodyMd);
}

export function resolveCookingSteps(opts: {
	steps: string | null | undefined;
	bodyMd: string;
}): string[] {
	const explicit = parseStepLines(opts.steps);
	if (explicit.length > 0) return explicit;
	return deriveStepsFromBody(opts.bodyMd);
}
