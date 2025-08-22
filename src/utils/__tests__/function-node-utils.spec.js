import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as functionNodeUtils from '../function-node-utils.js';
import { log, nextId, nodes } from '../state.js';

vi.mock('../state', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        log: vi.fn()
    };
});

describe('addFunctionNode', () => {
    beforeEach(() => {
        nodes.value = [];
        nextId.value = 1;
        log.mockClear();
    });

    it('adds a function node with correct properties', () => {
        functionNodeUtils.addFunctionNode();
        expect(nodes.value.length).toBe(1);
        const node = nodes.value[0];
        expect(node).toMatchObject({
            id: expect.anything(),
            type: 'function',
            funcName: 'myAction',
            x: 300,
            y: 300,
            inputs: [],
            outputs: []
        });
    });

    it('calls log with correct arguments', () => {
        functionNodeUtils.addFunctionNode();
        expect(log).toHaveBeenCalledWith(
            'Function node added',
            expect.objectContaining({
                funcName: 'myAction',
                type: 'function',
                x: 300,
                y: 300,
                inputs: [],
                outputs: []
            })
        );
    });
});
