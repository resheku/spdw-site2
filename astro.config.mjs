// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

import svelte from '@astrojs/svelte';
import { inlineSqlPlugin } from './vite-plugin-inline-sql.mjs';

// https://astro.build/config
export default defineConfig({
	vite: {
		plugins: [inlineSqlPlugin(), tailwindcss()],
	},

	adapter: cloudflare({
		imageService: 'cloudflare',
	}),

	integrations: [svelte()],
});
