import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as state from '../state.js';
import * as nodeLibrary from '../node-library.js';
import * as nodeFactory from '../node-factory.js';
import * as idUtils from '../id-utils.js';
import { addCommonSystemNode, addSystemNode, getAvailableSystemNodes, searchAvailableNodes } from '../system-node-utils.js';

describe('system-node-utils', () => {
    beforeEach(() => {
        state.nodes.value = [];
        vi.spyOn(idUtils, 'getNextNodeId').mockImplementation(() => 'sys-1');
        vi.spyOn(nodeFactory, 'createNodeFromDefinition').mockImplementation((defId, x, y, overrides) => ({
            id: overrides?.id || 'sys-1',
            type: 'system',
            nodeDefId: defId,
            x,
            y,
            ...overrides
        }));
    });

    it('addSystemNode adds a node and returns it', () => {
        const node = addSystemNode('print', { x: 10, y: 20 });
        expect(node).toMatchObject({ id: 'sys-1', type: 'system', nodeDefId: 'print', x: 10, y: 20 });
        expect(state.nodes.value).toContainEqual(node);
    });

    it('getAvailableSystemNodes returns system nodes', () => {
        vi.spyOn(nodeLibrary, 'getSystemNodes').mockReturnValue([{ id: 'print' }, { id: 'delay' }]);
        expect(getAvailableSystemNodes()).toEqual([{ id: 'print' }, { id: 'delay' }]);
    });

    it('searchAvailableNodes returns matching nodes', () => {
        vi.spyOn(nodeLibrary, 'searchNodeLibrary').mockReturnValue({ print: { id: 'print' } });
        expect(searchAvailableNodes('print')).toEqual({ print: { id: 'print' } });
    });

    it('addCommonSystemNode adds known node, returns null for unknown', () => {
        const node = addCommonSystemNode('print', { x: 1, y: 2 });
        expect(node).toMatchObject({ nodeDefId: 'print', x: 1, y: 2 });
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(addCommonSystemNode('unknown')).toBeNull();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Unknown system node'));
        spy.mockRestore();
    });
});
