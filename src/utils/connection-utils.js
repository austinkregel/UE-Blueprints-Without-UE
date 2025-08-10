import {nodes, ioPositions, draggingConnection, log} from './state.js';
import { getIOPosition } from './io-positions.js';
import { getNextNodeId } from './id-utils.js';
import { connections, addConnection } from './connection-manager.js';
import {nextTick} from "vue";
import {getConnectionPointsArray} from "./io-utils.js";
function isDuplicateConnection(from, to) {
    return connections.value.some(conn =>
        conn.from?.nodeId === from?.nodeId && conn.from?.output === from?.output &&
        conn.to?.nodeId === to?.nodeId && conn.to?.input === to?.input
    );
}
function isSelfConnection(from, to) {
    return from?.nodeId === to?.nodeId;
}
function isVariableGetToSet(fromNode, toNode) {
    return (
        fromNode && toNode &&
        fromNode.type === 'variable' && fromNode.varAction === 'get' &&
        toNode.type === 'variable' && toNode.varAction === 'set' &&
        fromNode.varName === toNode.varName
    );
}
function getIOType(node, ioName, ioType) {
    if (!node) return null;
    let arr = ioType === 'input' ? node.inputs : node.outputs;
    let io = arr?.find(x => (x.name || x) === ioName);
    return io?.type || null;
}

export function connectNodes({ from, to, areTypesCompatible }) {
    // Provide a default areTypesCompatible if not supplied
    const defaultAreTypesCompatible = (fromType, toType) => {
        // Default: allow casting between int <-> float, int <-> string, float <-> string
        const numericTypes = ['int', 'float'];
        if (fromType === toType) return false; // Already handled above
        if (numericTypes.includes(fromType) && numericTypes.includes(toType)) return true;
        if ((numericTypes.includes(fromType) && toType === 'string') || (numericTypes.includes(toType) && fromType === 'string')) return true;
        // Extend with more rules as needed
        return false;
    };
    areTypesCompatible = areTypesCompatible || defaultAreTypesCompatible;

    if (!from?.nodeId || !to?.nodeId) {
        log('Invalid connection attempt:', { from, to });
        return;
    }
    if (isDuplicateConnection(from, to))  {
        log('Duplicate connection ignored:', { from, to });
        return;
    }
    if (isSelfConnection(from, to)) {
        log('Ignoring self connection', { from, to });
        return;
    }
    const fromNode = nodes.value.find(n => n.id === from.nodeId);
    const toNode = nodes.value.find(n => n.id === to.nodeId);
    if (isVariableGetToSet(fromNode, toNode)) return;

    // Determine direction and types
    let fromType, toType, fromIsOutput = true;
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

    if (fromType === toType) {
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
        const castNodeId = getNextNodeId('cast');
        const castNode = {
            id: castNodeId,
            type: 'system',
            systemName: 'cast',
            systemOp: `Cast ${fromType}→${toType}`,
            x: (fromNode.x + toNode.x) / 2,
            y: (fromNode.y + toNode.y) / 2,
            inputs: [{ name: 'in', type: fromType }],
            outputs: [{ name: 'out', type: toType }],
        };
        nodes.value.push(castNode);
        if (fromIsOutput) {
            addConnection({ from, to: { nodeId: castNodeId, input: 'in' } });
            addConnection({ from: { nodeId: castNodeId, output: 'out' }, to });
        } else {
            addConnection({ from: to, to: { nodeId: castNodeId, input: 'in' } });
            addConnection({ from: { nodeId: castNodeId, output: 'out' }, to: from });
        }
        const startPos = getIOPosition(to.nodeId, fromIsOutput ? 'input' : 'output', fromIsOutput ? to.input : from.input) || { x: 0, y: 0 };
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
