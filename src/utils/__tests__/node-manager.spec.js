import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createNode, destroyNode, getNode, registerNodeType} from '../node-manager.js';

vi.mock('../id-utils.js', () => ({getNextNodeId: vi.fn((type) => `${type}-id`)}));

describe('node-manager', () => {
    beforeEach(() => {
        // no easy reset hook for registry/instances; create unique types per test if needed
    });

    it('registers a custom type and creates a node', () => {
        registerNodeType('custom', ({id, x = 1, y = 2}) => ({id, type: 'custom', x, y}));
        const n = createNode('custom', {x: 10, y: 20});
        expect(n).toMatchObject({id: 'custom-id', type: 'custom', x: 10, y: 20});
        expect(getNode('custom-id')).toStrictEqual(n);
    });

    it('throws for unknown node type', () => {
        expect(() => createNode('nope')).toThrow(/Unknown node type/);
    });

    it('validates required fields from factory', () => {
        registerNodeType('bad', () => ({type: 'bad', x: 0, y: 0})); // missing id
        expect(() => createNode('bad')).toThrow(/missing required field/i);
    });

    it('destroyNode removes instance and calls onDestroy if present', () => {
        registerNodeType('withLifecycle', ({id}) => ({id, type: 'withLifecycle', x: 0, y: 0, onDestroy: vi.fn()}));
        const n = createNode('withLifecycle');
        const spy = n.onDestroy;
        destroyNode(n.id);
        expect(spy).toHaveBeenCalled();
        expect(getNode(n.id)).toBeUndefined();
    });

    it('creates defaults for builtin types', () => {
        const f = createNode('function');
        expect(f).toMatchObject({id: 'function-id', type: 'function'});
        const v = createNode('variable');
        expect(v).toMatchObject({id: 'variable-id', type: 'variable'});
        const s = createNode('system');
        expect(s).toMatchObject({id: 'system-id', type: 'system'});
    });
});
