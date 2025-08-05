import {nodes, log} from './base-node-utils';
import { getNextNodeId } from './id-utils.js';

export function addActionNode() {
    nodes.value.push({
        id: getNextNodeId('action'),
        type: 'function',
        funcName: 'action',
        hasExec: true,
        x: 400,
        y: 200,
        inputs: [
            { name: 'Exec', type: 'Exec' }
        ],
        outputs: [
            { name: 'Exec', type: 'Exec' }
        ]
    });
    log('Action node added', nodes.value[nodes.value.length - 1]);
}
