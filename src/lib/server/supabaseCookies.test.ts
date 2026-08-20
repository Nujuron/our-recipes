import { describe, expect, it } from 'vitest';
import { headersWithoutCacheControl } from './supabaseCookies';

describe('headersWithoutCacheControl', () => {
	it('strips Cache-Control so a second PKCE cookie write cannot 500', () => {
		expect(
			headersWithoutCacheControl({
				'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
				Expires: '0',
				Pragma: 'no-cache'
			})
		).toEqual({
			Expires: '0',
			Pragma: 'no-cache'
		});
	});

	it('strips cache-control regardless of header casing', () => {
		expect(headersWithoutCacheControl({ 'cache-control': 'no-store', Expires: '0' })).toEqual({
			Expires: '0'
		});
	});

	it('returns an empty object when there is nothing left to set', () => {
		expect(headersWithoutCacheControl({ 'Cache-Control': 'no-store' })).toEqual({});
		expect(headersWithoutCacheControl(undefined)).toEqual({});
	});
});
