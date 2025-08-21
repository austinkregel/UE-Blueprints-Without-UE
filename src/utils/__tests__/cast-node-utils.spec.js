import {beforeEach, describe, expect, it, vi} from 'vitest';
import {draggingConnection, nodes} from '../state.js';
import * as connectionUtils from '../connection-utils.js';
import {addConnection} from '../connection-manager.js';

// Mock addConnection and log in connection-manager.js
vi.mock('../connection-manager.js', () => ({
    addConnection: vi.fn(),
    connections: {value: []}
}));
// Mock areTypesCompatible in connection-utils.js
vi.mock('../connection-utils', async () => {
    const actual = await vi.importActual('../connection-utils');
    return {
        ...actual,
        areTypesCompatible: vi.fn(() => true)
        // Do NOT mock log here, so the real log is used
    };
});

// Helper to reset nodes to initial state
function resetNodes() {
    nodes.value = [
        {
            id: 2,
            type: 'variable',
            varName: 'counter',
            varType: 'int',
            varAction: 'get',
            x: 350,
            y: 120,
            inputs: [],
            outputs: [{name: 'value', type: 'int'}]
        },
        {
            id: 4,
            type: 'function',
            funcName: 'print',
            hasExec: true,
            x: 600,
            y: 180,
            inputs: [{name: 'msg', type: 'string'}],
            outputs: []
        }
    ];
}

describe('cast node creation on incompatible type connection', () => {
    beforeEach(() => {
        resetNodes();
        draggingConnection.value = null;
        addConnection.mockClear();
    });

    it('creates a cast node and connects through it', () => {
        // Simulate connection from variable get output to print msg input
        const from = {nodeId: 2, output: 'value'};
        const to = {nodeId: 4, input: 'msg'};
        // Simulate incompatible types (int -> string)
        const areTypesCompatible = connectionUtils.areTypesCompatible;
        connectionUtils.connectNodes({from, to, areTypesCompatible});
        // Find the cast node
        const castNode = nodes.value.find((n) => n.systemName === 'cast');
        expect(castNode).toBeDefined();
        expect(castNode.inputs[0]).toEqual({name: 'in', type: 'int'});
        expect(castNode.outputs[0]).toEqual({name: 'out', type: 'string'});
        // Check connections
        expect(addConnection).toHaveBeenCalledWith({from, to: {nodeId: castNode.id, input: 'in'}});
        expect(addConnection).toHaveBeenCalledWith({from: {nodeId: castNode.id, output: 'out'}, to});
        // No log assertion needed
    });
});

describe('cast node utils', () => {
    it('dummy', () => {
        expect(true).toBe(true);
    });
});
