import { describe, expect, it } from 'vitest';
import { indexDefinitionsByName, resolveAgainstDefinitions } from '../graph-resolve.js';

// A tiny stand-in for the discovered definitions.
const DEFS = {
    'mercs2.ObjectFilter.SetFilter': {
        id: 'mercs2.ObjectFilter.SetFilter',
        name: 'ObjectFilter.SetFilter',
        category: 'MERCS2_OBJECTFILTER',
        inputs: [
            { name: 'Exec', type: 'exec' },
            { name: 'f', type: 'object' },
            { name: 'expr', type: 'string' }
        ],
        outputs: [{ name: 'Exec', type: 'exec' }]
    }
};

function loweredCall() {
    // What the Lua lowering emits for `ObjectFilter.SetFilter(x, "hp>0")`:
    return {
        nodes: [
            {
                id: 'function-1',
                type: 'function',
                funcName: 'ObjectFilter.SetFilter',
                category: 'FUNCTION',
                inputs: [
                    { name: 'exec', type: 'exec' },
                    { name: 'arg1', type: 'mixed' },
                    { name: 'arg2', type: 'mixed', defaultValue: 'hp>0' }
                ],
                outputs: [
                    { name: 'exec', type: 'exec' },
                    { name: 'result', type: 'mixed' }
                ]
            }
        ],
        connections: [{ from: { nodeId: 'variable-9', output: 'x' }, to: { nodeId: 'function-1', input: 'arg1' } }]
    };
}

describe('resolveAgainstDefinitions', () => {
    it('adopts the real signature: pin names, types, category, nodeDefId', () => {
        const g = resolveAgainstDefinitions(loweredCall(), DEFS);
        const n = g.nodes[0];
        expect(n.nodeDefId).toBe('mercs2.ObjectFilter.SetFilter');
        expect(n.category).toBe('MERCS2_OBJECTFILTER');
        // data pins take the definition's names + types (by position)
        const f = n.inputs.find((i) => i.name === 'f');
        const expr = n.inputs.find((i) => i.name === 'expr');
        expect(f.type).toBe('object');
        expect(expr.type).toBe('string');
        expect(n.inputs.some((i) => i.name === 'arg1')).toBe(false);
    });

    it('carries a baked value onto the renamed pin', () => {
        const g = resolveAgainstDefinitions(loweredCall(), DEFS);
        const expr = g.nodes[0].inputs.find((i) => i.name === 'expr');
        expect(expr.defaultValue).toBe('hp>0');
    });

    it('remaps a wired connection into the renamed pin', () => {
        const g = resolveAgainstDefinitions(loweredCall(), DEFS);
        expect(g.connections[0].to.input).toBe('f'); // was arg1
    });

    it('leaves exec pins intact so flow wiring survives', () => {
        const g = resolveAgainstDefinitions(loweredCall(), DEFS);
        expect(g.nodes[0].inputs.some((i) => i.name === 'exec' && i.type === 'exec')).toBe(true);
        expect(g.nodes[0].outputs.some((o) => o.name === 'exec' && o.type === 'exec')).toBe(true);
    });

    it('ignores calls with no matching definition', () => {
        const g = resolveAgainstDefinitions(
            {
                nodes: [{ id: 'x', type: 'function', funcName: 'Nope.Nope', inputs: [{ name: 'arg1', type: 'mixed' }], outputs: [] }],
                connections: []
            },
            DEFS
        );
        expect(g.nodes[0].nodeDefId).toBeUndefined();
        expect(g.nodes[0].inputs[0].name).toBe('arg1');
    });

    it('indexes definitions by their call name', () => {
        const idx = indexDefinitionsByName(DEFS);
        expect(idx.get('ObjectFilter.SetFilter').id).toBe('mercs2.ObjectFilter.SetFilter');
    });
});
