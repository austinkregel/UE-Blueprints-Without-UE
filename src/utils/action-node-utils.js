import {nodes, log} from './state.js';
import { getNextNodeId } from './id-utils.js';

export function addActionNode(position = { x: 400, y: 200 }) {
    const newNode = {
        id: getNextNodeId('action'),
        type: 'function',
        funcName: 'action',
        x: position.x,
        y: position.y,
        inputs: [],
        outputs: []
    };
    nodes.value.push(newNode);
    log('Action node added', newNode);
    return newNode;
}
