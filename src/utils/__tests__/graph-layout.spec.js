import { describe, expect, it } from 'vitest';
import { layoutGraph } from '../graph-layout.js';

const exec = { name: 'exec', type: 'exec' };
const val = { name: 'value', type: 'mixed' };

function entry(id) {
    return { id, type: 'function', outputs: [{ name: 'body', type: 'exec' }], inputs: [] };
}
function step(id) {
    return { id, type: 'function', inputs: [exec], outputs: [exec] };
}
function branch(id) {
    return {
        id,
        type: 'function',
        inputs: [exec, { name: 'condition', type: 'bool' }],
        outputs: [
            { name: 'then', type: 'exec' },
            { name: 'else', type: 'exec' }
        ]
    };
}
function value(id) {
    return { id, type: 'variable', inputs: [], outputs: [val] };
}
const wire = (fromId, output, toId, input) => ({ from: { nodeId: fromId, output }, to: { nodeId: toId, input } });

describe('layoutGraph', () => {
    it('flows an exec chain left-to-right at a stable lane height', () => {
        const graph = {
            nodes: [entry('e'), step('a'), step('b')],
            connections: [wire('e', 'body', 'a', 'exec'), wire('a', 'exec', 'b', 'exec')]
        };
        layoutGraph(graph);
        const [e, a, b] = graph.nodes;
        expect(a.x).toBeGreaterThan(e.x);
        expect(b.x).toBeGreaterThan(a.x);
        expect(a.y).toBe(e.y); // linear chain stays at one height
        expect(b.y).toBe(e.y);
    });

    it('fans branch paths downward and to the right', () => {
        const graph = {
            nodes: [entry('e'), branch('br'), step('t'), step('f')],
            connections: [wire('e', 'body', 'br', 'exec'), wire('br', 'then', 't', 'exec'), wire('br', 'else', 'f', 'exec')]
        };
        layoutGraph(graph);
        const t = graph.nodes.find((n) => n.id === 't');
        const f = graph.nodes.find((n) => n.id === 'f');
        const br = graph.nodes.find((n) => n.id === 'br');
        expect(t.x).toBeGreaterThan(br.x);
        expect(f.x).toBeGreaterThan(br.x);
        expect(f.y).toBeGreaterThan(t.y); // else path sits below the then path
    });

    it('stacks value providers above their consumer', () => {
        const graph = {
            nodes: [entry('e'), step('a'), value('v')],
            connections: [wire('e', 'body', 'a', 'exec'), wire('v', 'value', 'a', 'arg1')]
        };
        // give 'a' an arg1 input so the data edge is recognized as data (non-exec)
        graph.nodes[1].inputs = [exec, { name: 'arg1', type: 'mixed' }];
        layoutGraph(graph);
        const a = graph.nodes.find((n) => n.id === 'a');
        const v = graph.nodes.find((n) => n.id === 'v');
        expect(v.y).toBeLessThan(a.y); // provider above consumer
    });

    it('gives every node a position and separates entry lanes', () => {
        const graph = {
            nodes: [entry('e1'), step('a'), entry('e2'), step('b')],
            connections: [wire('e1', 'body', 'a', 'exec'), wire('e2', 'body', 'b', 'exec')]
        };
        layoutGraph(graph);
        for (const n of graph.nodes) {
            expect(Number.isFinite(n.x)).toBe(true);
            expect(Number.isFinite(n.y)).toBe(true);
        }
        const e1 = graph.nodes.find((n) => n.id === 'e1');
        const e2 = graph.nodes.find((n) => n.id === 'e2');
        expect(e2.y).toBeGreaterThan(e1.y); // second lane is lower
    });

    it('is a no-op on an empty graph', () => {
        const g = { nodes: [], connections: [] };
        expect(layoutGraph(g)).toBe(g);
    });
});
