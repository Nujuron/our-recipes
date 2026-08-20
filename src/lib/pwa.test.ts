import { describe, expect, it } from 'vitest';
import { isIosDevice, isStandaloneDisplay, shouldShowIosInstallHint } from './pwa';

const desktopNav = {
	userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
	platform: 'Win32',
	maxTouchPoints: 0
};

const iPhoneNav = {
	userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
	platform: 'iPhone',
	maxTouchPoints: 5
};

const iPadOsNav = {
	userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
	platform: 'MacIntel',
	maxTouchPoints: 5
};

function media(matches: Record<string, boolean>) {
	return {
		matchMedia: (query: string) => ({ matches: Boolean(matches[query]) })
	};
}

describe('pwa install detection', () => {
	it('detects iPhone and iPadOS, but not desktop Chrome', () => {
		expect(isIosDevice(iPhoneNav)).toBe(true);
		expect(isIosDevice(iPadOsNav)).toBe(true);
		expect(isIosDevice(desktopNav)).toBe(false);
	});

	it('treats standalone display modes and iOS navigator.standalone as installed', () => {
		expect(isStandaloneDisplay(desktopNav, media({ '(display-mode: standalone)': true }))).toBe(
			true
		);
		expect(isStandaloneDisplay({ ...iPhoneNav, standalone: true }, media({}))).toBe(true);
		expect(isStandaloneDisplay(desktopNav, media({}))).toBe(false);
	});

	it('shows the iOS hint only when Safari is not already installed', () => {
		expect(shouldShowIosInstallHint(iPhoneNav, media({}), false)).toBe(true);
		expect(shouldShowIosInstallHint(iPhoneNav, media({}), true)).toBe(false);
		expect(
			shouldShowIosInstallHint(iPhoneNav, media({ '(display-mode: standalone)': true }), false)
		).toBe(false);
		expect(shouldShowIosInstallHint(desktopNav, media({}), false)).toBe(false);
	});
});
