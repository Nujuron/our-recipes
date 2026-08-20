import { createContext } from 'svelte';
import { IOS_HINT_STORAGE_KEY, isIosDevice, isStandaloneDisplay } from './pwa';

export type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export class PwaInstall {
	canPrompt = $state(false);
	isStandalone = $state(false);
	isIos = $state(false);
	showIosHint = $state(false);
	#deferred: BeforeInstallPromptEvent | null = null;

	hydrate() {
		this.isStandalone = isStandaloneDisplay();
		this.isIos = isIosDevice();
		if (this.isStandalone) {
			this.canPrompt = false;
			this.showIosHint = false;
			return;
		}

		let dismissed = false;
		try {
			dismissed = localStorage.getItem(IOS_HINT_STORAGE_KEY) === '1';
		} catch {
			dismissed = false;
		}
		this.showIosHint = this.isIos && !dismissed;

		window.addEventListener('beforeinstallprompt', this.#onBeforeInstall);
		window.addEventListener('appinstalled', this.#onInstalled);
	}

	#onBeforeInstall = (event: Event) => {
		event.preventDefault();
		this.#deferred = event as BeforeInstallPromptEvent;
		this.canPrompt = true;
		this.showIosHint = false;
	};

	#onInstalled = () => {
		this.#deferred = null;
		this.canPrompt = false;
		this.isStandalone = true;
		this.showIosHint = false;
	};

	dismissIosHint() {
		this.showIosHint = false;
		try {
			localStorage.setItem(IOS_HINT_STORAGE_KEY, '1');
		} catch {
			// ignore quota / private-mode failures
		}
	}

	async promptInstall() {
		if (!this.#deferred) return;
		await this.#deferred.prompt();
		await this.#deferred.userChoice;
		this.#deferred = null;
		this.canPrompt = false;
	}
}

export const [getPwaInstall, setPwaInstall] = createContext<PwaInstall>();
