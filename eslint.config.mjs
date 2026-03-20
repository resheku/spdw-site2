import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig(
	js.configs.recommended,
	tseslint.configs.recommended,
	astro.configs.recommended,
	svelte.configs.recommended,
	{
		// Browser globals for Svelte components
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser,
			},
			globals: {
				...globals.browser,
			},
		},
	},
	{
		// Browser globals for Astro client scripts
		files: ['**/*.astro'],
		languageOptions: {
			globals: {
				...globals.browser,
			},
		},
	},
	{
		ignores: ['node_modules', 'dist', '.wrangler', '.astro'],
	}
);
