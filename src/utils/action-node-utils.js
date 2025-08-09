import {nodes, log} from './base-node-utils.js';
import { getNextNodeId } from './id-utils.js';

export function addActionNode(position = { x: 400, y: 200 }) {
    nodes.value.push({
        id: getNextNodeId('action'),
        type: 'function',
        funcName: 'action',
        x: position.x,
        y: position.y,
        inputs: [],
        outputs: []
    });
    log('Action node added', nodes.value[nodes.value.length - 1]);
}
