import { paraglideVitePlugin } from '@inlang/paraglide-js';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

const sensitivePath = /\/(?:(?:es|de)\/)?(?:auth|oauth|mcp|\.well-known)(?:\/|$)/;

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			serviceWorker: {
				register: false
			}
		}),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			// URL first so /es/... links actually switch locale; cookie keeps the choice
			strategy: ['url', 'cookie', 'baseLocale'],
			routeStrategies: [
				{ match: '/mcp', exclude: true },
				{ match: '/mcp/:path(.*)?', exclude: true },
				{ match: '/.well-known/:path(.*)?', exclude: true },
				{ match: '/oauth/:path(.*)?', strategy: ['cookie', 'baseLocale'] }
			]
		}),

		SvelteKitPWA({
			disable: Boolean(process.env.VITEST),
			registerType: 'prompt',
			injectRegister: false,
			strategies: 'generateSW',
			scope: '/',
			base: '/',
			manifest: {
				id: '/',
				name: 'Our Recipes',
				short_name: 'Our Recipes',
				description: 'Save family favorites, share them with anyone, and keep cooking together.',
				lang: 'en',
				dir: 'ltr',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				background_color: '#f3f0e8',
				theme_color: '#f3f0e8',
				categories: ['food', 'lifestyle'],
				icons: [
					{
						src: '/pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/pwa-192x192-maskable.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'maskable'
					},
					{
						src: '/pwa-512x512-maskable.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				],
				shortcuts: [
					{
						name: 'Shopping list',
						short_name: 'Shopping',
						url: '/shopping',
						icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
					},
					{
						name: 'My recipes',
						short_name: 'Recipes',
						url: '/me',
						icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
					}
				]
			},
			workbox: {
				globPatterns: [
					'client/**/*.{js,css,ico,png,svg,webp,webmanifest}',
					'prerendered/**/*.{html,json}'
				],
				globIgnores: ['prerendered/**'],
				navigateFallback: undefined,
				navigateFallbackDenylist: [sensitivePath],
				cleanupOutdatedCaches: true,
				runtimeCaching: [
					{
						urlPattern: sensitivePath,
						handler: 'NetworkOnly'
					},
					{
						urlPattern: ({ request }) =>
							request.mode === 'navigate' || request.destination === 'document',
						handler: 'NetworkOnly'
					},
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-stylesheets',
							expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
							cacheableResponse: { statuses: [0, 200] }
						}
					},
					{
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-webfonts',
							expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
							cacheableResponse: { statuses: [0, 200] }
						}
					},
					{
						urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object/'),
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'recipe-covers',
							expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
							cacheableResponse: { statuses: [0, 200] }
						}
					}
				]
			},
			kit: {
				includeVersionFile: true
			},
			devOptions: {
				enabled: false
			}
		})
	]
});
