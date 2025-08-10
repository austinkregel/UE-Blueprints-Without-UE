import { nodes, log } from './state.js';
import { getNextNodeId } from './id-utils.js';

export function addFunctionNode() {
    nodes.value.push({
        id: getNextNodeId('function'),
        type: 'function',
        funcName: 'myAction',
        x: 300,
        y: 300,
        inputs: [],
        outputs: []
    });

    log('Function node added', nodes.value[nodes.value.length - 1]);
}
