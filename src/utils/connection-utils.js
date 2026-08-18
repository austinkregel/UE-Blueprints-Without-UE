import { draggingConnection, log, nodes } from './state.js';
import { getIOPosition } from './io-positions.js';
import { createCastNode } from './node-factory.js';
import { addConnection, getConnections } from './connection-manager.js';
import { canCast, isSameType } from './type-utils.js';

function isDuplicateConnection(from, to) {
    return getConnections().some(
        (conn) =>
            conn.from?.nodeId === from?.nodeId && conn.from?.output === from?.output && conn.to?.nodeId === to?.nodeId && conn.to?.input === to?.input
    );
}

function isSelfConnection(from, to) {
    return from?.nodeId === to?.nodeId;
}

function isVariableGetToSet(fromNode, toNode) {
    return (
        fromNode &&
        toNode &&
        fromNode.type === 'variable' &&
        fromNode.varAction === 'get' &&
        toNode.type === 'variable' &&
        toNode.varAction === 'set' &&
        fromNode.varName === toNode.varName
    );
}

function getIOType(node, ioName, ioType) {
    if (!node) return null;
    const arr = ioType === 'input' ? node.inputs : node.outputs;
    const io = arr?.find((x) => (x.name || x) === ioName);
    return io?.type || null;
}

export function connectNodes({ from, to, areTypesCompatible }) {
    // Default compatibility uses centralized canCast
    const defaultAreTypesCompatible = (fromType, toType) => canCast(fromType, toType);
    areTypesCompatible = areTypesCompatible || defaultAreTypesCompatible;

    if (!from?.nodeId || !to?.nodeId) {
        log('Invalid connection attempt:', { from, to });
        return;
    }
    if (isDuplicateConnection(from, to)) {
        log('Duplicate connection ignored:', { from, to });
        return;
    }
    if (isSelfConnection(from, to)) {
        log('Ignoring self connection', { from, to });
        return;
    }
    const fromNode = nodes.value.find((n) => n.id === from.nodeId);
    const toNode = nodes.value.find((n) => n.id === to.nodeId);
    if (isVariableGetToSet(fromNode, toNode)) return;

    // Determine direction and types
    let fromType, toType, fromIsOutput;
    if (from.output && to.input) {
        fromType = getIOType(fromNode, from.output, 'output');
        toType = getIOType(toNode, to.input, 'input');
        fromIsOutput = true;
    } else if (from.input && to.output) {
        fromType = getIOType(fromNode, from.input, 'input');
        toType = getIOType(toNode, to.output, 'output');
        fromIsOutput = false;
    } else {
        // Try to infer direction if only one side is set
        if (from.output && to.output) {
            // Connecting output to output (invalid)
            log('Invalid IO direction for connection: output to output', { from, to });
            return;
        } else if (from.input && to.input) {
            // Connecting input to input (invalid)
            log('Invalid IO direction for connection: input to input', { from, to });
            return;
        } else {
            log('Invalid IO direction for connection:', { from, to });
            return;
        }
    }
    if (!fromType || !toType) {
        log('Invalid IO types for connection:', { from, to, fromType, toType });
        return;
    }

    if (isSameType(fromType, toType)) {
        if (fromIsOutput) {
            addConnection({ from, to });
        } else {
            addConnection({ from: to, to: from });
        }
        // Start next drag from the target input just connected
        const startPos = getIOPosition(to.nodeId, 'input', to.input) || { x: 0, y: 0 };
        draggingConnection.value = {
            from: to,
            to: null,
            type: 'output',
            start: startPos,
            mouse: startPos
        };
        return;
    }
    if (typeof areTypesCompatible !== 'undefined' && areTypesCompatible(fromType, toType)) {
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;
        const castNode = createCastNode(fromType, toType, midX, midY);
        // mark for discovery in some tests/utilities
        castNode.systemName = 'cast';
        const castNodeId = castNode.id;
        nodes.value.push(castNode);
        if (fromIsOutput) {
            addConnection({ from, to: { nodeId: castNodeId, input: 'in' } });
            addConnection({ from: { nodeId: castNodeId, output: 'out' }, to });
        } else {
            addConnection({ from: to, to: { nodeId: castNodeId, input: 'in' } });
            addConnection({ from: { nodeId: castNodeId, output: 'out' }, to: from });
        }
        const startPos = getIOPosition(to.nodeId, fromIsOutput ? 'input' : 'output', fromIsOutput ? to.input : from.input) || {
            x: 0,
            y: 0
        };
        draggingConnection.value = {
            from: to,
            to: null,
            type: 'output',
            start: startPos,
            mouse: startPos
        };
        log('Connection established with cast node:', { from, to, castNode });
        return;
    }
    log('Connection failed: incompatible types and no cast available', { from, to, fromType, toType });
}

export { isDuplicateConnection, isSelfConnection, isVariableGetToSet, getIOType };
