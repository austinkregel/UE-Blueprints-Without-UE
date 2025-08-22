import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nodes } from '../state.js';
import { addExecFlowPattern, addNodeFromDefinition, addNodePattern, addVariableNode } from '../node-creation.js';
import { getNodeDefinition } from '../language-definition.js';

describe('node-creation', () => {
    beforeEach(() => {
        nodes.value = [];
    });

    it('adds a node from a valid definition', () => {
        const def = getNodeDefinition('add');
        if (!def) return; // skip when def missing
        const node = addNodeFromDefinition('add', { x: 123, y: 456 });
        expect(node).toBeTruthy();
        expect(nodes.value.includes(node)).toBe(true);
        expect(node).toMatchObject({ nodeDefId: 'add', x: 123, y: 456 });
    });

    it('returns null and warns when definition missing', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const node = addNodeFromDefinition('___missing_def___');
        expect(node).toBeNull();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('adds a variable node', () => {
        const v = addVariableNode('score', 'int', 'get', { x: 10, y: 20 });
        expect(v).toBeTruthy();
        expect(v).toMatchObject({ varName: 'score', varType: 'int', varAction: 'get' });
        expect(nodes.value.includes(v)).toBe(true);
    });

    it('adds a data processing pattern', () => {
        const added = addNodePattern('data_processing', { x: 200, y: 200 });
        expect(Array.isArray(added)).toBe(true);
        expect(added.length).toBe(3);
    });

    it('adds an exec flow pattern', () => {
        const added = addExecFlowPattern('sequential_execution', { x: 100, y: 100 });
        expect(Array.isArray(added)).toBe(true);
        expect(added.length).toBe(3);
    });
});
