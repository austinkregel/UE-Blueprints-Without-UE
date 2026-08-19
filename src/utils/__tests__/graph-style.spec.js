import { describe, expect, it } from 'vitest';
import { classifyNode, styleLoweredNodes } from '../graph-style.js';

const exec = { name: 'exec', type: 'exec' };

describe('classifyNode', () => {
    it('recognizes a branch by its then/else outputs', () => {
        const n = {
            type: 'function',
            inputs: [exec],
            outputs: [
                { name: 'then', type: 'exec' },
                { name: 'else', type: 'exec' }
            ]
        };
        expect(classifyNode(n)).toEqual({ glyph: 'branch', color: 'gray' });
    });

    it('recognizes an operator by a+b→result', () => {
        const n = { type: 'function', funcName: '>', inputs: [{ name: 'a' }, { name: 'b' }], outputs: [{ name: 'result' }] };
        expect(classifyNode(n).glyph).toBe('math');
    });

    it('recognizes an entry (exec out, none in, body)', () => {
        const n = { type: 'function', funcName: 'Activated', inputs: [], outputs: [{ name: 'body', type: 'exec' }] };
        expect(classifyNode(n)).toEqual({ glyph: 'event', color: 'red' });
    });

    it('recognizes a pure getter by name (incl. leading underscore)', () => {
        expect(classifyNode({ type: 'function', funcName: 'Object.IsAlive', inputs: [], outputs: [] }).glyph).toBe('get');
        expect(classifyNode({ type: 'function', funcName: 'self:_GetFlag', inputs: [], outputs: [] }).glyph).toBe('get');
    });

    it('falls back to a generic call', () => {
        expect(classifyNode({ type: 'function', funcName: 'self:CreateChild', inputs: [], outputs: [] })).toEqual({ glyph: 'method', color: 'blue' });
    });

    it('leaves non-function nodes alone', () => {
        expect(classifyNode({ type: 'variable', varName: 'x' })).toBeNull();
    });
});

describe('styleLoweredNodes', () => {
    it('styles unresolved nodes but not resolved ones', () => {
        const graph = {
            nodes: [
                { id: 'a', type: 'function', funcName: 'Ai.Goal', nodeDefId: 'mercs2.Ai.Goal', inputs: [], outputs: [] },
                { id: 'b', type: 'function', funcName: 'self:BunkerBuster', inputs: [], outputs: [] }
            ]
        };
        styleLoweredNodes(graph);
        expect(graph.nodes[0].glyph).toBeUndefined(); // resolved → category styles it
        expect(graph.nodes[1].glyph).toBe('method'); // unresolved → classified
    });
});
