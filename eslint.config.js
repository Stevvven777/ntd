import eslint from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { readFileSync, readdirSync } from 'node:fs';
import { createTestLocaleCopyRule } from './build/eslint/test-locale-copy.mjs';

const localeDirectory = new URL('./packages/web-shared/src/i18n/locales/', import.meta.url);
const localeResources = Object.fromEntries(
	readdirSync(localeDirectory)
		.filter((name) => name.endsWith('.json'))
		.map((name) => [name.slice(0, -5), JSON.parse(readFileSync(new URL(name, localeDirectory), 'utf8'))]),
);

export default tseslint.config(
	{
		ignores: ['dist/**', '**/dist/**', '**/dist-types/**', '**/*.tsbuildinfo', 'node_modules/**'],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['tests/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}', 'e2e-coop/**/*.{ts,tsx}'],
		plugins: { 'test-locale': { rules: { 'no-hardcoded-copy': createTestLocaleCopyRule(localeResources) } } },
		rules: { 'test-locale/no-hardcoded-copy': 'error' },
	},
	{
		rules: {
			curly: ['error', 'all'],
		},
	},
	{
		files: [
			'packages/web-shared/src/**/*.{ts,tsx}',
			'apps/web-single/src/**/*.{ts,tsx}',
			'apps/web-coop/src/**/*.{ts,tsx}',
		],
		languageOptions: {
			globals: globals.browser,
		},
		plugins: {
			'react-hooks': reactHooks,
		},
		rules: {
			'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
			'@typescript-eslint/no-explicit-any': 'error',
			'no-console': 'error',
			'react-hooks/exhaustive-deps': 'error',
			'react-hooks/rules-of-hooks': 'error',
		},
	},
	{
		files: ['packages/web-shared/src/**/*.tsx', 'apps/web-single/src/**/*.tsx', 'apps/web-coop/src/**/*.tsx'],
		rules: {
			complexity: ['error', 20],
			'max-lines-per-function': ['error', { max: 180, skipBlankLines: true, skipComments: true }],
			'no-nested-ternary': 'error',
		},
	},
	{
		files: ['apps/coop-server/src/**/*.ts', 'packages/coop/src/**/*.ts', 'packages/game-core/src/**/*.ts'],
		languageOptions: {
			globals: globals.node,
		},
	},
	{
		files: ['packages/game-core/src/signals/**/*.{ts,tsx}'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'react',
							message: 'Signal definitions and interpreters must remain framework-independent.',
						},
					],
					patterns: [
						{
							group: ['**/game/**', '**/ui/**', '**/defense-archive/**', '**/i18n/**'],
							message:
								'The signals domain must not depend on game orchestration, UI, persistence, or i18n runtime code.',
						},
					],
				},
			],
		},
	},
	{
		files: ['**/*.mjs', '**/*.js'],
		languageOptions: {
			globals: globals.node,
		},
	},
	{
		files: ['tests/**/*.ts'],
		languageOptions: {
			globals: globals.node,
		},
	},
);
