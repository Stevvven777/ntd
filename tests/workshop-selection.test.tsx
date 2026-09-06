// @vitest-environment jsdom
import { useSyncExternalStore } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import '@prism-bastion/web-shared/i18n';
import { GameEngine } from '@prism-bastion/game-core/game/engine';
import { Workshop } from '@prism-bastion/web-shared/ui/Workshop';

function LiveWorkshop({ engine }: { engine: GameEngine }) {
	const view = useSyncExternalStore(engine.subscribeView, engine.getViewSnapshot);
	return view.selectedTower ? <Workshop engine={engine} tower={view.selectedTower} view={view} /> : null;
}

function setup() {
	const engine = new GameEngine({ mode: 'creative', seed: 41 });
	const tower = engine.towers[0]!;
	engine.selectTower(tower.id);
	tower.slots.forEach((_, index) => engine.installModule(index, null));
	engine.installModule(0, 'pulse');
	engine.installModule(1, 'frost');
	engine.installModule(2, 'pulse');
	const { container } = render(<LiveWorkshop engine={engine} />);
	const slot = (index: number) => container.querySelector<HTMLButtonElement>(`.module-slot[data-slot="${index}"]`)!;
	const selected = (index: number) => {
		expect(container.querySelectorAll('.module-slot.selected')).toHaveLength(1);
		expect(slot(index).getAttribute('aria-pressed')).toBe('true');
		expect(document.activeElement).toBe(slot(index));
		expect(container.querySelector('.module-card.selected')).toBeNull();
	};
	return { engine, tower, container, slot, selected };
}

afterEach(cleanup);

it('tracks the clicked module through occupied, duplicate, empty, and boundary slots', async () => {
	const user = userEvent.setup();
	const { tower, slot, selected } = setup();
	await user.click(slot(0));
	selected(0);
	for (let index = 1; index < tower.slots.length; index += 1) {
		await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
		expect(tower.slots[index]).toBe('pulse');
		selected(index);
	}
	const atBoundary = [...tower.slots];
	await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
	expect(tower.slots).toEqual(atBoundary);
	selected(tower.slots.length - 1);
	await user.keyboard('{Alt>}{ArrowLeft}{ArrowLeft}{/Alt}');
	selected(tower.slots.length - 3);
	expect(tower.slots[0]).toBe('frost');
});

it('uses one selection when switching between pointer, focus, library, and movement keys', async () => {
	const user = userEvent.setup();
	const { tower, container, slot, selected } = setup();
	await user.click(slot(0));
	await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
	selected(1);
	await user.click(slot(0));
	await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
	expect(tower.slots[1]).toBe('frost');
	selected(1);
	act(() => slot(2).focus());
	selected(2);
	fireEvent.keyDown(slot(2), { key: 'ArrowLeft', altKey: true, repeat: true });
	selected(1);
	const library = container.querySelector<HTMLButtonElement>('[data-tutorial-module="arcbolt"]')!;
	await user.click(library);
	expect(library.getAttribute('aria-pressed')).toBe('true');
	expect(container.querySelector('.module-slot.selected')).toBeNull();
	const before = [...tower.slots];
	await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
	expect(tower.slots).toEqual(before);
});

it('continues keyboard movement after dragging an installed module', async () => {
	const user = userEvent.setup();
	const { tower, slot, selected } = setup();
	await user.click(slot(0));
	fireEvent.drop(slot(3), { dataTransfer: { getData: (type: string) => (type === 'text/slot' ? '0' : '') } });
	selected(3);
	await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
	expect(tower.slots[2]).toBe('pulse');
	selected(2);
});

it('follows a moved module after an authoritative co-op plan arrives', async () => {
	const user = userEvent.setup();
	const engine = new GameEngine({ mode: 'creative', seed: 41, externalControl: true });
	const source = engine.towers[0]!;
	const plan = {
		core: 20,
		maxCore: 20,
		shards: 500,
		inventory: { pulse: 3, frost: 3 },
		nextTowerId: source.id + 1,
		towers: [{ ...source, slots: ['pulse', 'frost', null, null, null] }],
	};
	engine.applyGamePlan(plan);
	engine.selectTower(source.id);
	const commands: Array<{ from: number; to: number }> = [];
	engine.setCommandSink((command) => {
		if (command.type === 'swap-modules') {
			commands.push(command);
		}
	});
	const { container } = render(<LiveWorkshop engine={engine} />);
	const slot = (index: number) => container.querySelector<HTMLButtonElement>(`.module-slot[data-slot="${index}"]`)!;
	await user.click(slot(0));
	await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
	expect(commands).toMatchObject([{ from: 0, to: 1 }]);
	expect(document.activeElement).toBe(slot(0));
	act(() =>
		engine.applyGamePlan({
			...plan,
			towers: [{ ...plan.towers[0]!, slots: ['frost', 'pulse', null, null, null] }],
		}),
	);
	expect(document.activeElement).toBe(slot(1));
	expect(slot(1).getAttribute('aria-pressed')).toBe('true');
	await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
	expect(commands).toMatchObject([
		{ from: 0, to: 1 },
		{ from: 1, to: 2 },
	]);
});
