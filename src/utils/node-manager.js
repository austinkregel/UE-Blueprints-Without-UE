/**
 * Enhanced Node Manager
 * Centralized node creation and management without classes
 */

import {ref} from 'vue';
import {getNextNodeId} from './id-utils.js';

// Centralized node registry
const nodeRegistry = new Map();
const nodeInstances = ref(new Map());

/**
 * Register a node type with its creation factory
 */
export function registerNodeType(type, factory) {
    nodeRegistry.set(type, factory);
}

/**
 * Enhanced node factory with validation and lifecycle
 */
export function createNode(type, config = {}) {
    const factory = nodeRegistry.get(type);
    if (!factory) {
        throw new Error(`Unknown node type: ${type}`);
    }

    const nodeId = getNextNodeId(type);
    const node = factory({
        id: nodeId,
        ...config
    });

    // Validate node structure
    validateNode(node);

    // Register instance
    nodeInstances.value.set(nodeId, node);

    return node;
}

/**
 * Node validation
 */
function validateNode(node) {
    const required = ['id', 'type', 'x', 'y'];
    for (const field of required) {
        if (!(field in node)) {
            throw new Error(`Node missing required field: ${field}`);
        }
    }
}

/**
 * Get node by ID
 */
export function getNode(nodeId) {
    return nodeInstances.value.get(nodeId);
}

/**
 * Node lifecycle management
 */
export function destroyNode(nodeId) {
    const node = nodeInstances.value.get(nodeId);
    if (node && node.onDestroy) {
        node.onDestroy();
    }
    nodeInstances.value.delete(nodeId);
}

// Register default node types
registerNodeType('function', (config) => ({
    type: 'function',
    funcName: 'CustomFunction',
    x: 200,
    y: 200,
    inputs: [],
    outputs: [],
    ...config
}));

registerNodeType('variable', (config) => ({
    type: 'variable',
    varName: 'myVar',
    varType: 'int',
    varAction: 'get',
    x: 200,
    y: 200,
    inputs: [],
    outputs: [],
    ...config
}));

registerNodeType('system', (config) => ({
    type: 'system',
    systemName: 'print',
    x: 200,
    y: 200,
    inputs: [],
    outputs: [],
    ...config
}));
