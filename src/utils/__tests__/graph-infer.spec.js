import { describe, expect, it } from 'vitest';
import { binaryResultType, inferTypes } from '../graph-infer.js';

const getNode = (id, varName) => ({ id, type: 'variable', varAction: 'get', varName, inputs: [], outputs: [{ name: varName, type: 'mixed' }] });
const setNode = (id, varName) => ({
    id,
    type: 'variable',
    varAction: 'set',
    varName,
    inputs: [
        { name: 'exec', type: 'exec' },
        { name: varName, type: 'mixed' }
    ],
    outputs: [{ name: 'exec', type: 'exec' }]
});
const binary = (id, op) => ({
    id,
    type: 'function',
    funcName: op,
    inputs: [
        { name: 'a', type: 'mixed' },
        { name: 'b', type: 'mixed' }
    ],
    outputs: [{ name: 'result', type: 'mixed' }]
});

describe('binaryResultType', () => {
    it('classifies operators by Lua semantics', () => {
        expect(binaryResultType('>', 'int', 'int')).toBe('bool');
        expect(binaryResultType('==', 'string', 'string')).toBe('bool');
        expect(binaryResultType('..', 'string', 'int')).toBe('string');
        expect(binaryResultType('+', 'int', 'int')).toBe('int');
        expect(binaryResultType('+', 'int', 'float')).toBe('float');
        expect(binaryResultType('/', 'int', 'int')).toBe('float');
    });
});

describe('inferTypes', () => {
    it('propagates an assigned literal type to reads of that variable', () => {
        // set x <- (baked int 5); get x elsewhere
        const set = setNode('s', 'x');
        set.inputs[1].defaultValue = 5;
        set.inputs[1].type = 'int'; // literal type baked by the lowering
        const get = getNode('g', 'x');
        const graph = { nodes: [set, get], connections: [] };
        inferTypes(graph);
        expect(get.outputs[0].type).toBe('int');
    });

    it('hypothesizes a comparison as bool and feeds it into a consumer pin', () => {
        const cmp = binary('c', '>');
        cmp.inputs[0].type = 'int';
        cmp.inputs[1].type = 'int';
        const branch = { id: 'br', type: 'function', funcName: 'Branch', inputs: [{ name: 'condition', type: 'mixed' }], outputs: [] };
        const graph = {
            nodes: [cmp, branch],
            connections: [{ from: { nodeId: 'c', output: 'result' }, to: { nodeId: 'br', input: 'condition' } }]
        };
        inferTypes(graph);
        expect(cmp.outputs[0].type).toBe('bool');
        expect(branch.inputs[0].type).toBe('bool'); // propagated along the data edge
    });

    it('chains inference: x=5 ; y = x + 1 ⇒ y is int', () => {
        const setX = setNode('sx', 'x');
        setX.inputs[1].type = 'int';
        setX.inputs[1].defaultValue = 5;
        const getX = getNode('gx', 'x');
        const add = binary('add', '+');
        add.inputs[1].type = 'int'; // the literal 1
        const setY = setNode('sy', 'y');
        const graph = {
            nodes: [setX, getX, add, setY],
            connections: [
                { from: { nodeId: 'gx', output: 'x' }, to: { nodeId: 'add', input: 'a' } },
                { from: { nodeId: 'add', output: 'result' }, to: { nodeId: 'sy', input: 'y' } }
            ]
        };
        inferTypes(graph);
        expect(getX.outputs[0].type).toBe('int');
        expect(add.outputs[0].type).toBe('int');
        expect(setY.inputs.find((i) => i.name === 'y').type).toBe('int');
    });

    it('leaves genuinely unknown types as mixed', () => {
        const get = getNode('g', 'mystery');
        const graph = { nodes: [get], connections: [] };
        inferTypes(graph);
        expect(get.outputs[0].type).toBe('mixed');
    });
});
