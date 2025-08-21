import {beforeEach, describe, expect, it} from 'vitest';
import {nodes} from '../state.js';
import {connections} from '../connection-manager.js';
import {
    addEntryPoint,
    clearEntryPoints,
    clearExecutionResults,
    emitEvent,
    evaluateGraphToSinks,
    executeGraph,
    executionResults,
    getEventListeners,
    registerEventListeners,
    validateGraphInputs
} from '../graph-executor.js';

function makeNode(id, opts = {}) {
    return {id, inputs: [], outputs: [], type: 'function', ...opts};
}

describe('graph-executor', () => {
    beforeEach(() => {
        nodes.value = [];
        connections.value = [];
        clearEntryPoints();
        clearExecutionResults();
    });

    it('validateGraphInputs reports missing inputs and type mismatch warnings', () => {
        const n1 = makeNode(1, {outputs: [{name: 'out', type: 'int'}]});
        const n2 = makeNode(2, {inputs: [{name: 'a', type: 'string'}]});
        nodes.value = [n1, n2];
        // Connect int -> string (mismatch)
        connections.value = [{from: {nodeId: 1, output: 'out'}, to: {nodeId: 2, input: 'a'}}];

        const res = validateGraphInputs({sinks: [{nodeId: 2, output: 'result'}]});
        expect(res.ok).toBe(true); // no required inputs without defaults are missing due to connection
        expect(res.warnings.length).toBeGreaterThan(0);
        expect(res.warnings[0].reason).toBe('type_mismatch');
    });

    it('evaluateGraphToSinks respects overrides and computes pure dataflow nodes', async () => {
        // A node with an input 'value' and output 'value' so default executor pass-through works
        const sink = makeNode(10, {
            inputs: [{name: 'value', type: 'int'}],
            outputs: [{name: 'value', type: 'int'}],
            nodeDefId: 'identity'
        });
        nodes.value = [sink];

        const out = await evaluateGraphToSinks({sinks: [{nodeId: 10, output: 'value'}], overrides: {10: {value: 42}}});
        expect(out.ok).toBe(true);
        expect(out.outputs).toHaveProperty('0', 42);
    });

    it('executes from an entry point and reaches a print node', async () => {
        const seq = makeNode(1, {nodeDefId: 'sequence', type: 'exec', outputs: [{name: 'Then 0', type: 'exec'}]});
        const pr = makeNode(2, {
            nodeDefId: 'print',
            inputs: [
                {name: 'Exec', type: 'exec'},
                {name: 'text', type: 'string'}
            ]
        });
        nodes.value = [seq, pr];
        connections.value = [{from: {nodeId: 1, output: 'Then 0'}, to: {nodeId: 2, input: 'Exec'}}];
        addEntryPoint(1);

        await executeGraph();
        // both nodes should have entries in results or history
        expect(executionResults.value.has(1)).toBe(true);
        expect(executionResults.value.has(2)).toBe(true);
    });

    it('event system registers and triggers on_event listeners', async () => {
        const listener = makeNode(7, {
            nodeDefId: 'on_event',
            inputs: [{name: 'eventName', type: 'string', defaultValue: 'Ping'}],
            outputs: []
        });
        nodes.value = [listener];
        registerEventListeners();
        expect(getEventListeners('Ping')).toContain(7);

        emitEvent('Ping', {ok: true});
        // after microtasks settle, the listener node should have results reflecting event data
        // Busy-wait microtask tick using a minimal timeout
        await new Promise((r) => setTimeout(r, 0));
        const res = executionResults.value.get(7) || {};
        expect(res.eventName).toBe('Ping');
        expect(res.eventData).toEqual({ok: true});
    });
});
