// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import '@prism-bastion/web-shared/i18n';
import { SignalArchive } from '@prism-bastion/web-single/SignalArchive';

afterEach(cleanup);

it('scrolls the signal index without arrow selection changes', async () => {
	const user = userEvent.setup();
	render(<SignalArchive onBack={vi.fn()} />);
	const list = document.querySelector<HTMLElement>('.signal-archive-index-list')!;
	const records = Array.from(list.querySelectorAll<HTMLButtonElement>('button'));
	await user.keyboard('{ArrowDown}');
	expect(list.scrollTop).toBe(72);
	await user.click(records[0]!);
	await user.keyboard('{ArrowRight}{ArrowLeft}');
	expect(document.activeElement).toBe(records[0]);
	expect(list.scrollTop).toBe(72);
	await user.keyboard('{ArrowDown}{ArrowUp}');
	expect(document.activeElement).toBe(records[0]);
	expect(list.scrollTop).toBe(72);
	await user.keyboard('{End}');
	expect(document.activeElement).toBe(records.at(-1));
	await user.keyboard('{Home}');
	expect(document.activeElement).toBe(records[0]);
});

it('leaves modified arrow keys to the browser', async () => {
	const user = userEvent.setup();
	render(<SignalArchive onBack={vi.fn()} />);
	const list = document.querySelector<HTMLElement>('.signal-archive-index-list')!;
	await user.keyboard('{ArrowDown}');
	for (const modifier of ['Alt', 'Control', 'Meta', 'Shift']) {
		await user.keyboard(`{${modifier}>}{ArrowDown}{ArrowUp}{/${modifier}}`);
		expect(list.scrollTop).toBe(72);
	}
});
