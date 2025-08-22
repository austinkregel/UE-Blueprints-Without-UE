import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nodes } from '../state.js';
import { addNode, deleteNode, moveNode, updateNode, updateNodeIO } from '../nodes-core.js';
import { pruneDanglingConnections } from '../connection-manager.js';

vi.mock('../connection-manager.js', () => ({
    pruneDanglingConnections: vi.fn()
}));

describe('nodes-core', () => {
    beforeEach(() => {
        nodes.value = [];
        vi.clearAllMocks();
    });

    it('addNode creates a function node with defaults at position', () => {
        const n = addNode({ x: 10, y: 20 });
        expect(n).toMatchObject({ type: 'function', x: 10, y: 20, inputs: [], outputs: [] });
        expect(nodes.value.includes(n)).toBe(true);
    });

    it('moveNode updates coordinates when id exists', () => {
        const n = addNode({ x: 0, y: 0 });
        moveNode({ id: n.id, x: 100, y: 200 });
        expect(nodes.value[0].x).toBe(100);
        expect(nodes.value[0].y).toBe(200);
    });

    it('updateNodeIO replaces IO arrays and prunes connections', () => {
        const n = addNode({ x: 0, y: 0 });
        updateNodeIO({ id: n.id, inputs: [{ name: 'a', type: 'int' }], outputs: [{ name: 'b', type: 'int' }] });
        expect(nodes.value[0].inputs).toEqual([{ name: 'a', type: 'int' }]);
        expect(nodes.value[0].outputs).toEqual([{ name: 'b', type: 'int' }]);
        expect(pruneDanglingConnections).toHaveBeenCalled();
    });

    it('updateNode updates allowed props only', () => {
        const n = addNode({ x: 1, y: 2 });
        updateNode({ id: n.id, x: 5, y: 6, funcName: 'Foo', bad: 'nope' });
        const updated = nodes.value[0];
        expect(updated).toMatchObject({ x: 5, y: 6, funcName: 'Foo' });
        expect(updated.bad).toBeUndefined();
    });

    it('deleteNode removes node, logs, and prunes; returns true/false appropriately', () => {
        const a = addNode({ x: 0, y: 0 });
        const ok = deleteNode(a.id);
        expect(ok).toBe(true);
        expect(nodes.value.length).toBe(0);
        expect(pruneDanglingConnections).toHaveBeenCalled();

        const missing = deleteNode(9999);
        expect(missing).toBe(false);
    });
});
