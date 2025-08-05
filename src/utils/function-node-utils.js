import {nodes, getNextNodeId, log} from './base-node-utils.js';

export function addFunctionNode() {
    nodes.value.push({
        id: getNextNodeId('function'),
        type: 'function',
        funcName: 'myAction',
        hasExec: true,
        x: 300,
        y: 300,
        inputs: [
            { name: 'Exec', type: 'Exec' }
        ],
        outputs: [
            { name: 'Exec', type: 'Exec' }
        ]
    });

    log('Function node added', nodes.value[nodes.value.length - 1]);
}
