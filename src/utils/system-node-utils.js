import { nodes } from './base-node-utils.js';
import { getNextNodeId } from './id-utils.js';

export function addSystemNode() {
    nodes.value.push({
        id: getNextNodeId('system'),
        type: 'system',
        systemName: 'mySystem',
        x: 500,
        y: 300,
        inputs: [],
        outputs: [],
    });
}
