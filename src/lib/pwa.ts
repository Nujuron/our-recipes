export const IOS_HINT_STORAGE_KEY = 'our-recipes-ios-install-dismissed';

type NavigatorLike = Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> & {
	standalone?: boolean;
};

type WindowLike = {
	matchMedia: (query: string) => { matches: boolean };
};

export function isStandaloneDisplay(
	nav: NavigatorLike | undefined = globalThis.navigator,
	win: WindowLike | undefined = globalThis.window
): boolean {
	if (!nav || !win) return false;
	return (
		win.matchMedia('(display-mode: standalone)').matches ||
		win.matchMedia('(display-mode: fullscreen)').matches ||
		win.matchMedia('(display-mode: minimal-ui)').matches ||
		Boolean(nav.standalone)
	);
}

export function isIosDevice(nav: NavigatorLike | undefined = globalThis.navigator): boolean {
	if (!nav) return false;
	const fromAgent = /iPad|iPhone|iPod/.test(nav.userAgent);
	const iPadOs = nav.platform === 'MacIntel' && nav.maxTouchPoints > 1;
	return fromAgent || iPadOs;
}

export function shouldShowIosInstallHint(
	nav: NavigatorLike | undefined = globalThis.navigator,
	win: WindowLike | undefined = globalThis.window,
	dismissed = false
): boolean {
	return isIosDevice(nav) && !isStandaloneDisplay(nav, win) && !dismissed;
}
