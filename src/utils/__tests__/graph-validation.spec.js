import { afterEach, describe, expect, it } from 'vitest';
import { nodes } from '../state.js';
import { orphanExecRule, typeMismatchRule, unsetInputRule } from '../graph-validation.js';

describe('graph-validation (engine-driven rules)', () => {
    afterEach(() => {
        nodes.value = [];
    });

    describe('orphanExecRule', () => {
        it('flags a node whose exec input is unwired', () => {
            const node = { id: 1, inputs: [{ name: 'Exec', type: 'exec' }] };
            const issues = orphanExecRule(node, { connections: [] });
            expect(issues).toHaveLength(1);
            expect(issues[0].title).toBe('No incoming execution');
            expect(issues[0].field).toBe('Exec');
        });

        it('does not flag when the exec input is wired', () => {
            const node = { id: 2, inputs: [{ name: 'Exec', type: 'exec' }] };
            const connections = [{ from: { nodeId: 1, output: 'Then' }, to: { nodeId: 2, input: 'Exec' } }];
            expect(orphanExecRule(node, { connections })).toHaveLength(0);
        });

        it('does not flag entry-style nodes (no exec input)', () => {
            const node = { id: 3, inputs: [], outputs: [{ name: 'Exec', type: 'exec' }] };
            expect(orphanExecRule(node, { connections: [] })).toHaveLength(0);
        });
    });

    describe('typeMismatchRule', () => {
        it('flags an incompatible incoming connection using the type system', () => {
            const src = { id: 1, outputs: [{ name: 'out', type: 'array' }] };
            const dst = { id: 2, inputs: [{ name: 'in', type: 'bool' }] };
            nodes.value = [src, dst];
            const connections = [{ from: { nodeId: 1, output: 'out' }, to: { nodeId: 2, input: 'in' } }];
            const issues = typeMismatchRule(dst, { connections });
            expect(issues).toHaveLength(1);
            expect(issues[0].level).toBe('error');
            expect(issues[0].field).toBe('in');
        });

        it('accepts a compatible connection (int → float)', () => {
            const src = { id: 1, outputs: [{ name: 'out', type: 'int' }] };
            const dst = { id: 2, inputs: [{ name: 'in', type: 'float' }] };
            nodes.value = [src, dst];
            const connections = [{ from: { nodeId: 1, output: 'out' }, to: { nodeId: 2, input: 'in' } }];
            expect(typeMismatchRule(dst, { connections })).toHaveLength(0);
        });

        it('ignores exec and mixed pins', () => {
            const src = { id: 1, outputs: [{ name: 'out', type: 'mixed' }] };
            const dst = { id: 2, inputs: [{ name: 'in', type: 'bool' }] };
            nodes.value = [src, dst];
            const connections = [{ from: { nodeId: 1, output: 'out' }, to: { nodeId: 2, input: 'in' } }];
            expect(typeMismatchRule(dst, { connections })).toHaveLength(0);
        });
    });

    describe('unsetInputRule', () => {
        it('flags an unset non-exec input with a field anchor', () => {
            const node = { id: 1, inputs: [{ name: 'nQuota', type: 'int' }] };
            const issues = unsetInputRule(node, { connections: [] });
            expect(issues).toHaveLength(1);
            expect(issues[0].field).toBe('nQuota');
        });
    });
});
