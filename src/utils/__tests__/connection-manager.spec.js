import { beforeEach, describe, expect, it } from 'vitest';
import { nodes } from '../state.js';
import { addConnection, connections, removeConnection } from '../connection-manager.js';

function makeNode(id, inputs, outputs) {
    return { id, inputs, outputs };
}

describe('connection-manager', () => {
    beforeEach(() => {
        nodes.value = [
            makeNode(1, [{ name: 'a', type: 'number' }], [{ name: 'out', type: 'number' }]),
            makeNode(2, [{ name: 'b', type: 'number' }], [{ name: 'out', type: 'number' }]),
            makeNode(3, [{ name: 'c', type: 'string' }], [{ name: 'out', type: 'string' }])
        ];
        connections.value = [];
    });

    it('adds a valid connection', () => {
        addConnection({ from: { nodeId: 1, output: 'out' }, to: { nodeId: 2, input: 'b' } });
        expect(connections.value.length).toBe(1);
        expect(connections.value[0].from.nodeId).toBe(1);
        expect(connections.value[0].to.nodeId).toBe(2);
    });

    it('prevents self-connection', () => {
        addConnection({ from: { nodeId: 1, output: 'out' }, to: { nodeId: 1, input: 'a' } });
        expect(connections.value.length).toBe(0);
    });

    it('prevents connection with incompatible types', () => {
        addConnection({ from: { nodeId: 1, output: 'out' }, to: { nodeId: 3, input: 'c' } });
        expect(connections.value.length).toBe(0);
    });

    it('prevents connection if nodes are missing', () => {
        addConnection({ from: { nodeId: 99, output: 'out' }, to: { nodeId: 2, input: 'b' } });
        expect(connections.value.length).toBe(0);
    });

    it('prevents connection if IO types are missing', () => {
        nodes.value[0].outputs = [{ name: 'out' }]; // no type
        addConnection({ from: { nodeId: 1, output: 'out' }, to: { nodeId: 2, input: 'b' } });
        expect(connections.value.length).toBe(0);
    });

    it('removes a connection', () => {
        addConnection({ from: { nodeId: 1, output: 'out' }, to: { nodeId: 2, input: 'b' } });
        expect(connections.value.length).toBe(1);
        removeConnection({ from: { nodeId: 1, output: 'out' }, to: { nodeId: 2, input: 'b' } });
        expect(connections.value.length).toBe(0);
    });
});
