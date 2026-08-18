import { describe, expect, it } from 'vitest';
import { buildGraphIR, getCodegenTargets, isEntryPointNode, registerCodegenTarget, runCodegen } from '../codegen.js';

const exec = { type: 'exec' };

describe('codegen', () => {
    describe('isEntryPointNode', () => {
        it('is an entry when it has an exec output and no exec input', () => {
            expect(isEntryPointNode({ inputs: [], outputs: [{ name: 'Body', ...exec }] })).toBe(true);
        });
        it('is not an entry when it has an exec input', () => {
            expect(isEntryPointNode({ inputs: [{ name: 'Exec', ...exec }], outputs: [{ name: 'Then', ...exec }] })).toBe(false);
        });
    });

    describe('buildGraphIR', () => {
        it('linearizes the exec flow from an entry point in order', () => {
            const entry = { id: 1, outputs: [{ name: 'Body', ...exec }], inputs: [] };
            const a = { id: 2, inputs: [{ name: 'Exec', ...exec }], outputs: [{ name: 'Exec', ...exec }] };
            const b = { id: 3, inputs: [{ name: 'Exec', ...exec }], outputs: [] };
            const connections = [
                { from: { nodeId: 1, output: 'Body' }, to: { nodeId: 2, input: 'Exec' } },
                { from: { nodeId: 2, output: 'Exec' }, to: { nodeId: 3, input: 'Exec' } }
            ];
            const ir = buildGraphIR({ nodes: [entry, a, b], connections });
            expect(ir.entries).toHaveLength(1);
            expect(ir.entries[0].entry.id).toBe(1);
            expect(ir.entries[0].steps.map((s) => s.node.id)).toEqual([2, 3]);
        });

        it('resolves an input to a literal (default) or a ref (connection)', () => {
            const entry = { id: 1, outputs: [{ name: 'Body', ...exec }], inputs: [] };
            const src = { id: 9, outputs: [{ name: 'value', type: 'int' }], inputs: [] };
            const step = {
                id: 2,
                inputs: [
                    { name: 'Exec', ...exec },
                    { name: 'quota', type: 'int', defaultValue: 5 },
                    { name: 'target', type: 'object' }
                ],
                outputs: []
            };
            const connections = [
                { from: { nodeId: 1, output: 'Body' }, to: { nodeId: 2, input: 'Exec' } },
                { from: { nodeId: 9, output: 'value' }, to: { nodeId: 2, input: 'target' } }
            ];
            const ir = buildGraphIR({ nodes: [entry, src, step], connections });
            const inputs = ir.entries[0].steps[0].inputs;
            // exec inputs are excluded
            expect(inputs.map((i) => i.name)).toEqual(['quota', 'target']);
            expect(inputs.find((i) => i.name === 'quota').value).toEqual({ kind: 'literal', value: 5 });
            const targetVal = inputs.find((i) => i.name === 'target').value;
            expect(targetVal.kind).toBe('ref');
            expect(targetVal.nodeId).toBe(9);
        });

        it('returns no entries for a graph with no entry points', () => {
            const a = { id: 1, inputs: [{ name: 'Exec', ...exec }], outputs: [] };
            expect(buildGraphIR({ nodes: [a], connections: [] }).entries).toEqual([]);
        });

        it('handles multiple independent entry points', () => {
            const e1 = { id: 1, outputs: [{ name: 'Body', ...exec }], inputs: [] };
            const e2 = { id: 2, outputs: [{ name: 'Body', ...exec }], inputs: [] };
            const ir = buildGraphIR({ nodes: [e1, e2], connections: [] });
            expect(ir.entries.map((e) => e.entry.id).sort()).toEqual([1, 2]);
        });

        it('tolerates an empty/undefined graph', () => {
            expect(buildGraphIR().entries).toEqual([]);
            expect(buildGraphIR({}).entries).toEqual([]);
        });

        it('does not loop on cyclic exec connections', () => {
            const entry = { id: 1, outputs: [{ name: 'Body', ...exec }], inputs: [] };
            const a = { id: 2, inputs: [{ name: 'Exec', ...exec }], outputs: [{ name: 'Exec', ...exec }] };
            const connections = [
                { from: { nodeId: 1, output: 'Body' }, to: { nodeId: 2, input: 'Exec' } },
                { from: { nodeId: 2, output: 'Exec' }, to: { nodeId: 2, input: 'Exec' } }
            ];
            const ir = buildGraphIR({ nodes: [entry, a], connections });
            expect(ir.entries[0].steps.map((s) => s.node.id)).toEqual([2]);
        });
    });

    describe('target registry', () => {
        it('registers, lists, and runs a target; unknown target throws', () => {
            registerCodegenTarget('fake', (graph) => `-- ${graph.nodes.length} nodes`);
            expect(getCodegenTargets()).toContain('fake');
            expect(runCodegen('fake', { nodes: [{}, {}], connections: [] })).toEqual({ code: '-- 2 nodes', language: 'fake' });
            expect(() => runCodegen('nope', {})).toThrow(/No codegen target/);
        });

        it('accepts a {code, language} return', () => {
            registerCodegenTarget('obj', () => ({ code: 'x', language: 'lua' }));
            expect(runCodegen('obj', {})).toEqual({ code: 'x', language: 'lua' });
        });
    });
});
