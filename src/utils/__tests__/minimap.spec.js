import { describe, expect, it } from 'vitest';
import { computeMinimapLayout, minimapPointToWorld } from '../minimap.js';
import { centerOffset } from '../viewport-utils.js';

const mm = { w: 172, h: 100, pad: 10, nodeW: 220, nodeH: 120 };

describe('minimap geometry', () => {
    describe('computeMinimapLayout', () => {
        it('fits nodes + the visible region and places blips inside the map', () => {
            const nodes = [
                { id: 1, x: 0, y: 0 },
                { id: 2, x: 1000, y: 500 }
            ];
            const tl = { x: -100, y: -100 };
            const br = { x: 1200, y: 700 };
            const layout = computeMinimapLayout({ nodes, tl, br, mm });
            expect(layout.blips).toHaveLength(2);
            for (const b of layout.blips) {
                expect(b.x).toBeGreaterThanOrEqual(mm.pad - 0.001);
                expect(b.x).toBeLessThanOrEqual(mm.w - mm.pad + 0.001);
                expect(b.y).toBeGreaterThanOrEqual(mm.pad - 0.001);
                expect(b.y).toBeLessThanOrEqual(mm.h - mm.pad + 0.001);
            }
            expect(layout.view.w).toBeGreaterThan(0);
            expect(layout.view.h).toBeGreaterThan(0);
            expect(layout.scale).toBeGreaterThan(0);
        });

        it('round-trips a minimap point back to world coordinates', () => {
            const nodes = [{ id: 1, x: 200, y: 300 }];
            const tl = { x: 0, y: 0 };
            const br = { x: 800, y: 600 };
            const layout = computeMinimapLayout({ nodes, tl, br, mm });
            const blip = layout.blips[0];
            const world = minimapPointToWorld(blip.x, blip.y, layout, mm.pad);
            expect(world.x).toBeCloseTo(200, 5);
            expect(world.y).toBeCloseTo(300, 5);
        });

        it('is robust with no nodes (just the visible region)', () => {
            const layout = computeMinimapLayout({ nodes: [], tl: { x: 0, y: 0 }, br: { x: 800, y: 600 }, mm });
            expect(layout.blips).toEqual([]);
            expect(layout.scale).toBeGreaterThan(0);
        });
    });

    describe('centerOffset', () => {
        it('computes the offset that centres a world point', () => {
            // At zoom 1, centering (100,100) in an 800x600 canvas → offset (300,200)
            expect(centerOffset(100, 100, 1, 800, 600)).toEqual({ x: 300, y: 200 });
            // Zoom scales the world contribution.
            expect(centerOffset(100, 100, 2, 800, 600)).toEqual({ x: 200, y: 100 });
        });
    });
});
