import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as actionNodeUtils from '../action-node-utils.js';
import { log, nodes } from '../state.js';

vi.mock('../id-utils', () => ({
    getNextNodeId: vi.fn(() => 42)
}));
vi.mock('../state', async () => {
    const actual = await vi.importActual('../state');
    return {
        ...actual,
        log: vi.fn()
    };
});

describe('addActionNode', () => {
    beforeEach(() => {
        nodes.value = [];
        log.mockClear();
    });

    it('adds an action node with correct properties', () => {
        actionNodeUtils.addActionNode();
        expect(nodes.value.length).toBe(1);
        const node = nodes.value[0];
        expect(node).toMatchObject({
            id: 42,
            type: 'function',
            funcName: 'action',
            x: 400,
            y: 200,
            inputs: [],
            outputs: []
        });
    });

    it('calls log with correct arguments', () => {
        actionNodeUtils.addActionNode();
        expect(log).toHaveBeenCalledWith('Action node added', expect.objectContaining({ id: 42 }));
    });
});

describe('action node utils', () => {
    it('dummy', () => {
        expect(true).toBe(true);
    });
});
