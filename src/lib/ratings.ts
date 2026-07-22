export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const NOTE_MAX_LENGTH = 280;

export type RatingSummary = {
	average: number | null;
	count: number;
};

export type UserRating = {
	score: number;
	note: string | null;
};

export type RatingParseError = 'score' | 'note';

export type ParsedRatingInput =
	{ ok: true; score: number; note: string | null } | { ok: false; error: RatingParseError };

export function emptyRatingSummary(): RatingSummary {
	return { average: null, count: 0 };
}

export function summaryFromStats(
	ratingSum: number | null | undefined,
	ratingCount: number | null | undefined
): RatingSummary {
	const count = ratingCount ?? 0;
	if (count <= 0) return emptyRatingSummary();

	const sum = ratingSum ?? 0;
	return {
		average: Math.round((sum / count) * 10) / 10,
		count
	};
}

export function parseRatingInput(
	rawScore: FormDataEntryValue | null,
	rawNote: FormDataEntryValue | null
): ParsedRatingInput {
	const score = Number(rawScore);
	if (!Number.isInteger(score) || score < RATING_MIN || score > RATING_MAX) {
		return { ok: false, error: 'score' };
	}

	const noteRaw = String(rawNote ?? '').trim();
	if (noteRaw.length > NOTE_MAX_LENGTH) {
		return { ok: false, error: 'note' };
	}

	return {
		ok: true,
		score,
		note: noteRaw.length > 0 ? noteRaw : null
	};
}
