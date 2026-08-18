import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as systemNodeUtils from '../system-node-utils.js';
import { nodes } from '../state.js';

// Mock getNextNodeId to return predictable values
vi.mock('../id-utils', () => ({
    getNextNodeId: vi.fn(() => 77)
}));

describe('addSystemNode', () => {
    beforeEach(() => {
        nodes.value = [];
    });

    it('adds a system node with correct properties', () => {
        systemNodeUtils.addSystemNode('print');
        expect(nodes.value.length).toBe(1);
        const node = nodes.value[0];
        expect(node).toMatchObject({
            id: 77,
            type: 'system',
            systemName: 'print',
            x: 500,
            y: 300,
            inputs: [
                { name: 'Exec', type: 'exec' },
                { name: 'value', type: 'mixed' }
            ]
        });
        // A freshly-added system node initializes with no outputs; dynamic
        // outputs are attached later via updateNodeOutputs (see system-node-utils.js).
        expect(node.outputs).toBeUndefined();
    });

    it('initializes with provided dynamic outputs when given', () => {
        const dynamicOutputs = [{ name: 'Result', type: 'string' }];
        systemNodeUtils.addSystemNode('print', { x: 500, y: 300 }, dynamicOutputs);
        expect(nodes.value[0].outputs).toEqual(dynamicOutputs);
    });
});

describe('system node utils', () => {
    it('dummy', () => {
        expect(true).toBe(true);
    });
});
