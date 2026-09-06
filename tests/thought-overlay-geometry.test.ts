import { describe, expect, it } from 'vitest';
import {
	closestPointOnRect,
	overlapArea,
	positionedLoadout,
} from '@prism-bastion/web-shared/ui/thought-overlay/geometry';

describe('thought overlay geometry', () => {
	it('finds the closest edge point on a rectangle', () => {
		expect(closestPointOnRect([15, 0], { left: 10, top: 10, width: 20, height: 10 })).toEqual([15, 10]);
		expect(closestPointOnRect([40, 15], { left: 10, top: 10, width: 20, height: 10 })).toEqual([30, 15]);
	});

	it('calculates overlap relative to the overlay root', () => {
		const obstacle = { left: 110, top: 210, width: 20, height: 20 };
		expect(overlapArea({ left: 0, top: 0, width: 15, height: 15 }, obstacle, { left: 100, top: 200 })).toBe(25);
	});

	it('positions loadouts according to their requested tower anchor', () => {
		expect(
			positionedLoadout({ tower: [100, 100], width: 40, height: 20, towerRadius: 10, placement: 'right' }),
		).toEqual({ left: 120, top: 90 });
		expect(
			positionedLoadout({ tower: [100, 100], width: 40, height: 20, towerRadius: 10, placement: 'top-left' }),
		).toEqual({ left: 70, top: 60 });
	});
});
