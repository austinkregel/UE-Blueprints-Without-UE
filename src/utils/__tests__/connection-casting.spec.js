import { beforeEach, describe, expect, it } from 'vitest';
import { nodes, activeWorkspace, createWorkspace, workspaceState } from '../state.js';
import { getConnections } from '../connection-manager.js';
import { connectNodes } from '../connection-utils.js';

function makeNode(id, type, x, y, inputs, outputs) {
    return { id, type, x, y, inputs, outputs };
}

describe('connection casting behavior', () => {
    beforeEach(() => {
        // Reset workspace state and create a fresh active workspace.
        // connectNodes() reads/pushes nodes via the global `nodes` ref, while
        // connection-manager operates on `activeWorkspace.value`; point both at
        // the same array so node lookups and connection validation agree.
        workspaceState.workspaces = {};
        workspaceState.activeWorkspaceId = null;
        createWorkspace('test', { nodes: [], connections: [] });
        nodes.value = activeWorkspace.value.nodes;
    });

    it('connects identical data types without cast', () => {
        const a = makeNode('A', 'function', 0, 0, [], [{ name: 'out', type: 'int' }]);
        const b = makeNode('B', 'function', 200, 0, [{ name: 'in', type: 'int' }], []);
        nodes.value.push(a, b);

        connectNodes({ from: { nodeId: a.id, output: 'out' }, to: { nodeId: b.id, input: 'in' } });

        expect(getConnections().length).toBe(1);
        expect(getConnections()[0].from.nodeId).toBe('A');
        expect(getConnections()[0].to.nodeId).toBe('B');
    });

    it('auto-inserts cast for int -> float', () => {
        const a = makeNode('A', 'function', 0, 0, [], [{ name: 'out', type: 'int' }]);
        const b = makeNode('B', 'function', 200, 0, [{ name: 'in', type: 'float' }], []);
        nodes.value.push(a, b);

        connectNodes({ from: { nodeId: a.id, output: 'out' }, to: { nodeId: b.id, input: 'in' } });

        // Should be two connections via cast node
        expect(getConnections().length).toBe(2);
        const via = getConnections()
            .map((c) => c.from.nodeId)
            .find((id) => id !== 'A');
        const castNode = nodes.value.find((n) => n.id === via);
        expect(castNode).toBeDefined();
        expect(castNode.type).toBe('cast');
        expect(castNode.inputs[0].type).toBe('int');
        expect(castNode.outputs[0].type).toBe('float');
    });

    it('rejects exec/data mismatch', () => {
        const a = makeNode('A', 'exec', 0, 0, [], [{ name: 'Exec', type: 'exec' }]);
        const b = makeNode('B', 'function', 200, 0, [{ name: 'in', type: 'int' }], []);
        nodes.value.push(a, b);

        connectNodes({ from: { nodeId: a.id, output: 'Exec' }, to: { nodeId: b.id, input: 'in' } });

        expect(getConnections().length).toBe(0);
    });

    it('allows exec to exec', () => {
        const a = makeNode('A', 'exec', 0, 0, [], [{ name: 'Then', type: 'exec' }]);
        const b = makeNode('B', 'exec', 200, 0, [{ name: 'Exec', type: 'exec' }], []);
        nodes.value.push(a, b);

        connectNodes({ from: { nodeId: a.id, output: 'Then' }, to: { nodeId: b.id, input: 'Exec' } });

        expect(getConnections().length).toBe(1);
    });

    it('casts null and mixed appropriately', () => {
        const a = makeNode('A', 'function', 0, 0, [], [{ name: 'out', type: 'null' }]);
        const b = makeNode('B', 'function', 200, 0, [{ name: 'in', type: 'string' }], []);
        nodes.value.push(a, b);

        connectNodes({ from: { nodeId: a.id, output: 'out' }, to: { nodeId: b.id, input: 'in' } });

        // Should insert cast node due to canCast(null -> string)
        expect(getConnections().length).toBe(2);
        const via = getConnections()
            .map((c) => c.from.nodeId)
            .find((id) => id !== 'A');
        const castNode = nodes.value.find((n) => n.id === via);
        expect(castNode).toBeDefined();
        expect(castNode.type).toBe('cast');
        expect(castNode.outputs[0].type).toBe('string');
    });
});
