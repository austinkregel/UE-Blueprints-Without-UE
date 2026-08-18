import { log, nextId, nodes } from './state.js';
import { pruneDanglingConnections } from './connection-manager.js';

export function addNode({ x = 200, y = 200, id, type, nodeDefId, ...args } = {}) {
    // Use provided id/type or defaults
    const newId = id !== undefined ? id : nextId.value++;
    const newType = type !== undefined ? type : 'function';
    const node = {
        id: newId,
        type: newType,
        funcName: 'CustomFunction',
        x,
        y,
        inputs: [],
        outputs: [],
        // Include nodeDefId if provided
        ...(nodeDefId !== undefined && { nodeDefId }),
        args
    };
    nodes.value.push(node);
    return node;
}

/**
 * Deep-clone a node with a new id, offset by (dx, dy). Pure — the returned node
 * shares no references with the original (safe to mutate independently).
 */
export function cloneNode(node, newId, dx = 0, dy = 0) {
    const clone = JSON.parse(JSON.stringify(node));
    clone.id = newId;
    clone.x = (node.x ?? 0) + dx;
    clone.y = (node.y ?? 0) + dy;
    return clone;
}

export function moveNode({ id, x, y }) {
    const node = nodes.value.find((n) => n.id === id);
    if (node) {
        node.x = x;
        node.y = y;
    }
}

export function updateNodeIO({ id, inputs, outputs }) {
    const node = nodes.value.find((n) => n.id === id);
    if (node) {
        node.inputs = Array.isArray(inputs) ? [...inputs] : [];
        node.outputs = Array.isArray(outputs) ? [...outputs] : [];
        // Drop connections that no longer match node pins
        pruneDanglingConnections();
    }
}

export function updateNode(props) {
    const node = nodes.value.find((n) => n.id === props?.id);
    if (!node) return;
    const allowed = ['name', 'x', 'y', 'funcName', 'varName', 'varType', 'varAction', 'value'];
    for (const key of allowed) {
        if (props[key] !== undefined) node[key] = props[key];
    }
}

export function deleteNode(nodeId) {
    const nodeIndex = nodes.value.findIndex((n) => n.id === nodeId);
    if (nodeIndex !== -1) {
        nodes.value.splice(nodeIndex, 1);
        log('Deleted node:', nodeId);
        pruneDanglingConnections();
        return true;
    }
    return false;
}
