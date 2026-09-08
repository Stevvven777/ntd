import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import tseslint from 'typescript-eslint';
import { createTestLocaleCopyRule } from '../build/eslint/test-locale-copy.mjs';

// Deliberately synthetic resources: changing game copy must not change this rule's tests.
const resources = {
	en: {
		'panel.open': 'Open sample panel',
		'panel.title': 'Sample (panel)?',
		'panel.send': 'Send {{amount}} tokens to {{name}}',
		'panel.missing': null,
		'panel.waveNumber': 'W{{wave}}',
	},
	other: { 'panel.open': String.fromCodePoint(0x6253, 0x5f00, 0x793a, 0x4f8b) },
};

function lint(code: string) {
	return new Linter().verify(code, {
		languageOptions: { parser: tseslint.parser },
		plugins: { 'test-locale': { rules: { 'no-hardcoded-copy': createTestLocaleCopyRule(resources) } } },
		rules: { 'test-locale/no-hardcoded-copy': 'error' },
	});
}

describe('localized test copy lint rule', () => {
	it.each([
		"page.getByRole('button', { name: 'Open sample panel' });",
		"screen.findAllByRole('button', { name: /open sample panel/i });",
		"screen.queryByLabelText('Open sample panel');",
		"page.getByPlaceholder('Open sample panel');",
		"page.getByTitle('Open sample panel');",
		"screen.getByAltText('Open sample panel');",
		"expect(button).toHaveAccessibleName('Open sample panel');",
		"expect(button.textContent).toBe('Open sample panel');",
		"expect(button.textContent?.trim()).not.toContain('Open sample panel');",
		"const text = button.textContent; expect(text).toEqual('Open sample panel');",
		"expect(await button.textContent()).toBe('Open sample panel');",
		"expect(button.getAttribute('aria-label')).toBe('Open sample panel');",
		"expect(button).toContainText('Send 20 tokens to Alpha');",
		'expect(button).toHaveText(`Send ${amount} tokens to ${name}`);',
		'page.getByText(/^Open sample/);',
		String.raw`page.getByText(/Sample \(panel\)\?/);`,
		String.raw`page.getByText('\u6253\u5f00\u793a\u4f8b');`,
		String.raw`page.getByText(/\u6253\u5f00\u793a\u4f8b/);`,
		"const label = 'Open sample panel'; page.getByText(label);",
		"const label = 'Open sample panel' as const; const alias = label; page.getByText(alias);",
		"const options = { name: 'Open sample panel' }; page.getByRole('button', options);",
		"page.getByText(new RegExp('Open sample panel'));",
		"expect(buttons).toHaveText(['Open sample panel']);",
	])('rejects resource-backed copy in %s', (code) => {
		const messages = lint(code);
		expect(messages).toHaveLength(1);
		expect(messages[0]?.ruleId).toBe('test-locale/no-hardcoded-copy');
		expect(messages[0]?.messageId).toBe('copy');
	});

	it.each([
		"page.getByRole('button', { name: en['panel.open'] });",
		"page.getByText(textPattern(en['panel.title']));",
		"page.getByText(translate('panel.send', { amount: 20, name: 'Alpha' }));",
		"page.getByRole('button', { name: `Alpha · ${en['panel.open']}` });",
		"page.getByText('Alpha');",
		"page.getByRole('slider', { name: 'Test-owned slider' });",
		"expect(count).toBe('20');",
		"expect(program.moduleId).toBe('Open sample panel');",
		"expect(button.getAttribute('data-state')).toBe('Open sample panel');",
		'expect(code).toMatch(/^[A-Z2-9]{6}$/);',
		String.raw`expect(row.textContent?.trim()).toMatch(/^b=\S+ w=\S+$/);`,
		'page.locator(\'[data-title="Open sample panel"]\');',
		"it('Open sample panel', () => {});",
		"const fixture = { title: 'Open sample panel' }; expect(copy(fixture)).toEqual(fixture);",
		'function check(label) { page.getByText(label); }',
		"const label = 'Open sample panel'; function check(label) { page.getByText(label); }",
		"const options = makeOptions(); page.getByRole('button', options);",
	])('allows localized expectations and independent fixtures in %s', (code) => {
		expect(lint(code)).toEqual([]);
	});

	it('allows a documented assertion-level exception', () => {
		expect(
			lint(
				[
					'// eslint-disable-next-line test-locale/no-hardcoded-copy -- This label is an input owned by the test.',
					"page.getByText('Open sample panel');",
				].join('\n'),
			),
		).toEqual([]);
	});
});
