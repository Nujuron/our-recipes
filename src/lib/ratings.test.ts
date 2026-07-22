import { describe, expect, it } from 'vitest';
import { NOTE_MAX_LENGTH, emptyRatingSummary, parseRatingInput, summaryFromStats } from './ratings';

describe('emptyRatingSummary', () => {
	it('returns a zeroed summary', () => {
		expect(emptyRatingSummary()).toEqual({ average: null, count: 0 });
	});
});

describe('summaryFromStats', () => {
	it('returns empty summary when count is zero', () => {
		expect(summaryFromStats(0, 0)).toEqual({ average: null, count: 0 });
		expect(summaryFromStats(null, null)).toEqual({ average: null, count: 0 });
	});

	it('computes a one-decimal average', () => {
		expect(summaryFromStats(14, 3)).toEqual({ average: 4.7, count: 3 });
		expect(summaryFromStats(10, 2)).toEqual({ average: 5, count: 2 });
		expect(summaryFromStats(5, 1)).toEqual({ average: 5, count: 1 });
	});
});

describe('parseRatingInput', () => {
	it('accepts boundary scores 1 and 5', () => {
		expect(parseRatingInput('1', '')).toEqual({ ok: true, score: 1, note: null });
		expect(parseRatingInput('5', '  Great  ')).toEqual({
			ok: true,
			score: 5,
			note: 'Great'
		});
	});

	it('rejects missing or invalid scores', () => {
		expect(parseRatingInput(null, null)).toEqual({ ok: false, error: 'score' });
		expect(parseRatingInput('0', '')).toEqual({ ok: false, error: 'score' });
		expect(parseRatingInput('6', '')).toEqual({ ok: false, error: 'score' });
		expect(parseRatingInput('3.5', '')).toEqual({ ok: false, error: 'score' });
		expect(parseRatingInput('abc', '')).toEqual({ ok: false, error: 'score' });
	});

	it('trims notes and rejects overlong notes', () => {
		expect(parseRatingInput('3', '   ')).toEqual({ ok: true, score: 3, note: null });
		expect(parseRatingInput('3', 'x'.repeat(NOTE_MAX_LENGTH))).toEqual({
			ok: true,
			score: 3,
			note: 'x'.repeat(NOTE_MAX_LENGTH)
		});
		expect(parseRatingInput('3', 'x'.repeat(NOTE_MAX_LENGTH + 1))).toEqual({
			ok: false,
			error: 'note'
		});
	});
});
