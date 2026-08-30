import { describe, expect, it } from 'vitest';
import { parseFamilyIds, parseFamilyName } from './families';

describe('parseFamilyIds', () => {
	it('keeps unique recipe-shaped uuids from form data', () => {
		const form = new FormData();
		form.append('family_ids', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
		form.append('family_ids', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
		form.append('family_ids', 'not-an-id');
		expect(parseFamilyIds(form)).toEqual(['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']);
	});

	it('treats an empty list as opt-out', () => {
		expect(parseFamilyIds([])).toEqual([]);
		expect(parseFamilyIds(new FormData())).toEqual([]);
	});
});

describe('parseFamilyName', () => {
	it('trims and rejects empty names', () => {
		expect(parseFamilyName('  Sunday cooks  ')).toBe('Sunday cooks');
		expect(parseFamilyName('   ')).toBeNull();
	});
});
