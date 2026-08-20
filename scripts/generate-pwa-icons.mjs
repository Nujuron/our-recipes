import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(resolve(root, 'static/favicon.svg'));

const sizes = [
	{ file: 'favicon-32x32.png', size: 32 },
	{ file: 'apple-touch-icon.png', size: 180 },
	{ file: 'pwa-192x192.png', size: 192 },
	{ file: 'pwa-512x512.png', size: 512 },
	{ file: 'pwa-512x512-maskable.png', size: 512 }
];

for (const { file, size } of sizes) {
	const png = new Resvg(svg, {
		fitTo: { mode: 'width', value: size }
	})
		.render()
		.asPng();
	await writeFile(resolve(root, 'static', file), png);
	console.log(`wrote static/${file}`);
}
