import {nodes, draggingConnection, log} from './base-node-utils.js';
import { connectNodes } from './connection-utils.js'

export function onEditorMouseDown(e) {
    // Do NOT clear draggingConnection on mouse down (so it stays attached to the mouse)
    // Are we dropping it on a node?
    const targetNode = nodes.value.find(node => {
        const rect = document.querySelector(`[data-node-id="${node.id}"]`).getBoundingClientRect();
        return (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom);
    });
    if (targetNode) {
        log(`Dropping on node: ${targetNode.id}`, { targetNode, draggingConnection: draggingConnection.value });
        // If draggingConnection is set, connect it to the target node's input
        if (draggingConnection.value) {
            const { type, from, to } = draggingConnection.value;
            log(`Connecting ${type} from ${from.nodeId}:${from.output} to ${to.nodeId}:${to.input}`, { type, from, to, targetNode });
            if (type === 'output' && targetNode.inputs.length > 0) {
                // Connect to the first input of the target node
                const input = targetNode.inputs[0].name || targetNode.inputs[0];
                connectNodes({ from: { nodeId: from.nodeId, output: from.output }, to: { nodeId: targetNode.id, input } });
                log(`Connected output ${from.output} to input ${input} of node ${targetNode.id}`);
            } else if (type === 'input' && targetNode.outputs.length > 0) {
                // Connect to the first output of the target node
                const output = targetNode.outputs[0].name || targetNode.outputs[0];
                connectNodes({ from: { nodeId: targetNode.id, output }, to: { nodeId: to.nodeId, input: to.input } });
                log(`Connected input ${to.input} of node ${to.nodeId} to output ${output} of node ${targetNode.id}`);
            } else {
                log('Unknown connection type or no compatible inputs/outputs', { type, targetNode });
            }
        }
    }
}

