// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GameEngine } from '@prism-bastion/game-core/game/engine';
import { TowerOverview } from '@prism-bastion/web-shared/ui/TowerOverview';
import i18n from '@prism-bastion/web-shared/i18n';

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('en');
});

it.each(['en', 'zh-CN'])('includes the upgrade level, cost and currency in its accessible name (%s)', async (language) => {
  await i18n.changeLanguage(language);
  const engine = new GameEngine({ mode: 'creative', seed: 41 });
  const tower = engine.towers[0]!;
  const cost = engine.getTowerUpgradeCost(tower);
  render(<TowerOverview engine={engine} tower={tower} />);
  const name = language === 'en'
    ? `Upgrade Lv.${tower.level + 1}, cost ${cost} shards`
    : i18n.t('tower.upgradeAria', { level: tower.level + 1, cost });
  const button = screen.getByRole('button', { name });
  expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
});

it('retains the maximum-level label without announcing a zero-cost upgrade', () => {
  const engine = new GameEngine({ mode: 'creative', seed: 41 });
  vi.spyOn(engine, 'getTowerUpgradeCost').mockReturnValue(0);
  render(<TowerOverview engine={engine} tower={engine.towers[0]!} />);
  const button = screen.getByRole('button', { name: /Max level/ });
  expect(button.hasAttribute('disabled')).toBe(true);
  expect(button.hasAttribute('aria-label')).toBe(false);
});
