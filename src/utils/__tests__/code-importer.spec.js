// filepath: /-/desktop-app/src/utils/__tests__/code-importer.spec.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFunctionNode } from '../node-factory.js';
import { mapParsedToGraph } from '../code-importer.js';

// Mock node-factory so we can intercept created nodes
vi.mock('../node-factory.js', () => ({
    createFunctionNode: vi.fn((funcName, inputs = [], outputs = [], x = 100, y = 100, overrides = {}) => ({
        id: 'fn-1',
        type: 'function',
        funcName,
        x,
        y,
        inputs: JSON.parse(JSON.stringify(inputs)),
        outputs: JSON.parse(JSON.stringify(outputs)),
        category: 'FUNCTION',
        ...overrides
    }))
}));

describe('code-importer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('maps a parsed function with params and return to a function node', () => {
        const nf = {
            filePath: '/proj/src/lib.rs',
            language: 'rust',
            symbols: [
                {
                    kind: 'function',
                    name: 'add',
                    params: [
                        { name: 'a', ty: 'i32' },
                        { name: 'b', ty: 'i32' }
                    ],
                    return_type: 'i32',
                    range: { start: { row: 1, col: 0 }, end: { row: 1, col: 20 } }
                }
            ]
        };

        const { nodes, connections, warnings } = mapParsedToGraph(nf, { start: { x: 50, y: 75 } });

        expect(connections).toEqual([]);
        expect(warnings || []).toEqual([]);
        expect(nodes).toHaveLength(1);
        const n = nodes[0];
        expect(createFunctionNode).toHaveBeenCalled();
        expect(n.type).toBe('function');
        expect(n.funcName).toBe('add');
        // Inputs on the left are represented by `inputs` array
        expect(n.inputs).toEqual([
            { name: 'a', type: 'int' },
            { name: 'b', type: 'int' }
        ]);
        // Outputs on the right are represented by `outputs` array
        expect(n.outputs).toEqual([{ name: 'result', type: 'int' }]);
        // Metadata retained
        expect(n.refs).toBeDefined();
        expect(n.refs.filePath).toBe('/proj/src/lib.rs');
        expect(n.refs.language).toBe('rust');
    });

    it('omits output for void/none return types and sanitizes param names', () => {
        const nf = {
            filePath: '/x.js',
            language: 'javascript',
            symbols: [{ kind: 'function', name: 'log', params: [{ name: 'msg text', ty: 'string' }], return_type: 'void' }]
        };

        const { nodes } = mapParsedToGraph(nf);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].inputs).toEqual([{ name: 'msg_text', type: 'string' }]);
        expect(nodes[0].outputs).toEqual([]);
    });
});
