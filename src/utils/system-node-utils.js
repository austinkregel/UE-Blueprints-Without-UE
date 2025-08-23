import { nodes } from './state.js';
import { getNextNodeId } from './id-utils.js';
import { getSystemNodes, searchNodeLibrary } from './node-library.js';
import { createNodeFromDefinition } from './node-factory.js';

/**
 * Add a system node by definition ID
 */
export function addSystemNode(nodeDefId = 'print', position = { x: 500, y: 300 }, outputs = []) {
    const newNode = createNodeFromDefinition(nodeDefId, position.x, position.y, {
        id: getNextNodeId('system'),
        type: 'system',
        systemName: nodeDefId,
        outputs: outputs.length > 0 ? outputs : undefined // Initialize with dynamic outputs if provided
    });

    nodes.value.push(newNode);
    return newNode;
}

/**
 * Update outputs for a specific node
 */
export function updateNodeOutputs(nodeId, newOutputs) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node) {
        node.outputs = newOutputs;
    } else {
        console.warn(`Node with ID ${nodeId} not found.`);
    }
}

/**
 * Get all available system node types
 */
export function getAvailableSystemNodes() {
    return getSystemNodes();
}

/**
 * Search for nodes by name or functionality
 */
export function searchAvailableNodes(searchTerm) {
    return searchNodeLibrary(searchTerm);
}

/**
 * Add a common system node by name
 */
export function addCommonSystemNode(nodeName, position = { x: 500, y: 300 }) {
    const commonNodes = {
        print: 'print',
        delay: 'delay',
        random: 'random',
        timer: 'on_timer',
        file_read: 'read_file',
        file_write: 'write_file',
        http_get: 'http_get',
        spawn: 'spawn_actor',
        // Execution flow control nodes
        sequence: 'sequence',
        branch: 'branch',
        gate: 'gate',
        multigate: 'multigate',
        do_once: 'do_once',
        do_n: 'do_n',
        flip_flop: 'flip_flop',
        for_loop: 'for_loop',
        for_each_loop: 'for_each_loop',
        while_loop: 'while_loop',
        retriggerable_delay: 'retriggerable_delay'
    };

    const nodeDefId = commonNodes[nodeName];
    if (nodeDefId) {
        return addSystemNode(nodeDefId, position);
    } else {
        console.warn(`Unknown system node: ${nodeName}`);
        return null;
    }
}
