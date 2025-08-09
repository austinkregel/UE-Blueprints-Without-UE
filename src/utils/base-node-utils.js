import { onBeforeUnmount, ref, onMounted, nextTick } from 'vue';
import { screenToWorld } from './viewport-utils.js';

export let dragging = false;
let offset = { x: 0, y: 0 };

import VariableNode from '../components/Nodes/VariableNode.vue';
import FunctionNode from '../components/Nodes/FunctionNode.vue';
import NodeBase from '../components/Nodes/NodeBase.vue';
import SystemNode from '../components/Nodes/SystemNode.vue';
import { connectNodes } from './connection-utils.js';
import { renderConnectionPath, registerAllIOForNode } from './io-utils.js';
import { connections } from './connection-manager.js';
import { createNodeFromDefinition } from './node-factory.js';
import { getNextNodeId } from './id-utils.js';
import { getNodeDefinition, getTypeColorHex } from './language-definition.js';

/**
 * Get the hex color for a connection based on its type
 */
export function getConnectionColor(conn) {
  if (!conn || !conn.from || !conn.to) return '#6b7280'; // Default gray
  
  // Find the source and target nodes
  const fromNode = nodes.value.find(n => n.id === conn.from.nodeId);
  const toNode = nodes.value.find(n => n.id === conn.to.nodeId);
  
  if (!fromNode || !toNode) return '#6b7280';
  
  // Find the output and input types
  const fromOutput = fromNode.outputs?.find(o => (o.name || o) === conn.from.output);
  const toInput = toNode.inputs?.find(i => (i.name || i) === conn.to.input);
  
  if (!fromOutput || !toInput) return '#6b7280';
  
  // Use the output type for coloring (since data flows from output to input)
  const outputType = fromOutput.type || 'mixed';
  return getTypeColorHex(outputType);
}

/**
 * Get the hex color for a dragging connection based on the dragging info
 */
export function getDraggingConnectionColor(draggingConn) {
  if (!draggingConn || !draggingConn.from) return '#6b7280'; // Default gray
  
  // Find the source node
  const fromNode = nodes.value.find(n => n.id === draggingConn.from.nodeId);
  if (!fromNode) return '#6b7280';
  
  // Find the output type
  const fromOutput = fromNode.outputs?.find(o => (o.name || o) === draggingConn.from.output);
  if (!fromOutput) return '#6b7280';
  
  // Use the output type for coloring
  const outputType = fromOutput.type || 'mixed';
  return getTypeColorHex(outputType);
}

export const nodes = ref([
    // Event Trigger Node
    {
        id: 1,
        type: 'function',
        nodeDefId: 'on_trigger_enter',
        funcName: 'On Trigger Enter',
        x: 100,
        y: 100,
        inputs: [],
        outputs: [
            { name: 'Other Actor', type: 'object' }
        ]
    },
    // Variable Get (boolean example)
    {
        id: 7,
        type: 'variable',
        varName: 'bIsActive',
        varType: 'bool',
        varAction: 'get',
        x: 450,
        y: 200,
        inputs: [],
        outputs: [
            { name: 'bIsActive', type: 'bool' }
        ]
    },
]);
export const nextId = ref(9);
export const ioPositions = ref({}); // { [nodeId]: { inputs: {name: {x,y}}, outputs: {name: {x,y}} } }
export const selectedNodeId = ref(null);
export const draggingConnection = ref(null); // { from: {nodeId, output}, to: {nodeId, input}, type: 'input'|'output', start: {x, y}, mouse: {x, y} }

export function addNode(position = { x: 200, y: 200 }) {
    nodes.value.push({
        id: nextId.value++,
        type: 'function',
        funcName: 'CustomFunction',
        x: position.x,
        y: position.y,
        inputs: [],
        outputs: [],
    });
}

export function moveNode({ id, x, y }) {
    const node = nodes.value.find(n => n.id === id);
    if (node) {
        node.x = x;
        node.y = y;
    }
}

export function deleteNode(nodeId) {
    const nodeIndex = nodes.value.findIndex(n => n.id === nodeId);
    if (nodeIndex !== -1) {
        nodes.value.splice(nodeIndex, 1);
        console.log('Deleted node:', nodeId);
        return true;
    }
    return false;
}

export function duplicateNode(node, offset = { x: 50, y: 50 }) {
    if (!node) return null;
    
    // Create a new node based on the original
    let newNode;
    if (node.nodeDefId) {
        // Use the definition ID to create a proper copy
        newNode = createNodeFromDefinition(node.nodeDefId, node.x + offset.x, node.y + offset.y);
    } else {
        // Fallback for legacy nodes
        newNode = {
            ...JSON.parse(JSON.stringify(node)), // Deep clone
            id: getNextNodeId(node.type || 'node'),
            x: node.x + offset.x,
            y: node.y + offset.y
        };
    }
    
    if (newNode) {
        nodes.value.push(newNode);
        console.log('Duplicated node:', newNode);
        return newNode;
    }
    return null;
}



export function startConnectionDrag({ nodeId, ioType, ioName, x, y }) {
    draggingConnection.value = {
        from: ioType === 'output' ? { nodeId, output: ioName } : null,
        to: ioType === 'input' ? { nodeId, input: ioName } : null,
        type: ioType,
        start: { x, y },
        mouse: { x, y }
    };
    window.addEventListener('mousemove', onConnectionDragMove);
    window.addEventListener('mouseup', onConnectionDragEnd);
}

export function onConnectionDragMove(e) {
    if (draggingConnection.value) {
        // Convert screen coordinates to world coordinates for proper dragging
        const worldPos = screenToWorld(e.clientX, e.clientY);
        draggingConnection.value.mouse = worldPos;
        draggingConnection.value.dragPos = worldPos; // For debug display
    }
}

export function onConnectionDragEnd(e) {
    window.removeEventListener('mousemove', onConnectionDragMove);
    window.removeEventListener('mouseup', onConnectionDragEnd);

    if (draggingConnection.value) {
        const targetNode = nodes.value.find(node => {
            const rect = document.querySelector(`[data-node-id="${node.id}"]`).getBoundingClientRect();
            return (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom);
        });

        if (targetNode) {
            const { type, from, to } = draggingConnection.value;
            // Try to find the IO pin under the mouse
            let foundIO = null;
            document.querySelectorAll('.io.input, .io.output').forEach((el) => {
                const rect = el.getBoundingClientRect();
                if (
                    e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom
                ) {
                    const isInput = el.classList.contains('input');
                    const ioType = isInput ? 'input' : 'output';
                    let nodeEl = el.closest('[data-node-id]');
                    let nodeId = nodeEl ? Number(nodeEl.getAttribute('data-node-id')) : undefined;
                    let ioName = el.getAttribute('data-io-name') || el.querySelector('.io-label')?.textContent?.trim() || el.textContent?.trim();
                    foundIO = { ioType, nodeId, ioName };
                }
            });
            if (foundIO && foundIO.nodeId === targetNode.id) {
                // Connect directly to the IO under the mouse
                if (type === 'output' && foundIO.ioType === 'input') {
                    connectNodes({ from: { nodeId: from.nodeId, output: from.output }, to: { nodeId: targetNode.id, input: foundIO.ioName } });
                } else if (type === 'input' && foundIO.ioType === 'output') {
                    connectNodes({ from: { nodeId: targetNode.id, output: foundIO.ioName }, to: { nodeId: to.nodeId, input: to.input } });
                }
            } else {
                // Fallback: find the first compatible IO by type, but skip Exec/data mismatches
                if (type === 'output' && targetNode.inputs.length > 0) {
                    const fromNode = nodes.value.find(n => n.id === from.nodeId);
                    const fromOutput = fromNode?.outputs?.find(o => (o.name || o) === from.output);
                    const fromType = fromOutput?.type;
                    const isExec = (x) => x && (x.type === 'exec' || x === 'exec' || (x.name || x) === 'exec' || x.type === 'Exec' || x === 'Exec' || (x.name || x) === 'Exec');
                    const compatibleInput = targetNode.inputs.find(input => {
                        if (isExec(input) !== isExec(fromOutput)) return false;
                        return input.type === fromType;
                    });
                    if (compatibleInput) {
                        connectNodes({ from: { nodeId: from.nodeId, output: from.output }, to: { nodeId: targetNode.id, input: compatibleInput.name || compatibleInput } });
                    }
                } else if (type === 'input' && targetNode.outputs.length > 0) {
                    const toNode = nodes.value.find(n => n.id === to.nodeId);
                    const toInput = toNode?.inputs?.find(i => (i.name || i) === to.input);
                    const toType = toInput?.type;
                    const isExec = (x) => x && (x.type === 'exec' || x === 'exec' || (x.name || x) === 'exec' || x.type === 'Exec' || x === 'Exec' || (x.name || x) === 'Exec');
                    const compatibleOutput = targetNode.outputs.find(output => {
                        if (isExec(output) !== isExec(toInput)) return false;
                        return output.type === toType;
                    });
                    if (compatibleOutput) {
                        connectNodes({ from: { nodeId: targetNode.id, output: compatibleOutput.name || compatibleOutput }, to: { nodeId: to.nodeId, input: to.input } });
                    }
                }
            }
        }
        draggingConnection.value = null;
    }
}

export function renderDraggingConnection() {
    if (!draggingConnection.value) return null;
    const { start, mouse } = draggingConnection.value;
    const points = [start, mouse];
    return renderConnectionPath(points);
}


export function isActionFlow(conn) {
    // If output or input is named 'Exec' or 'exec', treat as action flow
    const isExecName = (name) => name === 'Exec' || name === 'exec';
    return (isExecName(conn.from?.output) || isExecName(conn.to?.input));
}


export function selectNode({ id }) {
    if (id) {
        selectedNodeId.value = id;
    }
}

export function closeSettings() {
    selectedNodeId.value = null;
}

export function updateNodeIO({ id, inputs, outputs }) {
    const node = nodes.value.find(n => n.id === id);
    if (node) {
        node.inputs = [...inputs];
        node.outputs = [...outputs];
    }
}

export function getNodeComponent(node) {
    if (node.type === 'variable') return VariableNode;
    if (node.type === 'function') return FunctionNode;
    if (node.type === 'system') return SystemNode;
    return NodeBase;
}

export function deleteConnection({ from, to }) {
    // Remove the connection matching both endpoints
    connections.value = connections.value.filter(conn => {
        return !(
            conn.from?.nodeId === from?.nodeId && conn.from?.output === from?.output &&
            conn.to?.nodeId === to?.nodeId && conn.to?.input === to?.input
        );
    });
}

export function construction(emit, props, nodeRef) {
    // Helper to get IO elements for a node
    function getIOElements(type) {
        return nodeRef.value?.querySelectorAll('.io.' + type) || [];
    }

    function startDrag(e) {
        dragging = true;
        offset.x = e.clientX - props.node.x;
        offset.y = e.clientY - props.node.y;
        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', stopDrag);
    }

    async function onDrag(e) {
        if (!dragging) return;
        log('onDrag', {
            current: {
                nodeId: props.node.id, x: e.clientX, y: e.clientY
            },
            newPosition: {
                x: e.clientX - offset.x, y: e.clientY - offset.y
            }
        });
        emit('move', { id: props.node.id, x: e.clientX - offset.x, y: e.clientY - offset.y });
        await nextTick(registerAllIO);
    }

    function stopDrag() {
        dragging = false;
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
    }

    let connecting = null;

    async function startConnect(type, io) {
        log('startConnect', { type, io });
        connecting = { type, name: io.name || io };
        await nextTick(registerAllIO);
        // Notify editor to start connection drag
        const elList = getIOElements(type);
        let idx = (type === 'input' ? props.node.inputs : props.node.outputs).findIndex(x => (x.name || x) === (io.name || io));
        if (elList[idx]) {
            const rect = elList[idx].getBoundingClientRect();
            log('startConnect rect', { rect, idx });
            emit('start-connection-drag', {
                nodeId: props.node.id,
                ioType: type,
                ioName: io.name || io,
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                ioTypeForHighlight: io.type || ((io.name || io) === 'Exec' || (io.name || io) === 'exec' ? 'Exec' : 'data'),
            });
        }
        window.addEventListener('mouseup', finishConnect);
        highlightValidTargets(type, io);
    }

    function highlightValidTargets(type, io) {
        document.querySelectorAll('.io.valid-target').forEach(el => el.classList.remove('valid-target'));
        log('Highlighting valid targets for', { type, io });
        const isExec = (x) => (x.type === 'Exec' || x === 'Exec' || (x.name || x) === 'Exec' || x.type === 'exec' || x === 'exec' || (x.name || x) === 'exec');
        const lookingForExec = isExec(io);
        document.querySelectorAll('.io.' + (type === 'input' ? 'output' : 'input')).forEach((el) => {
            const label = el.querySelector('.io-label')?.textContent?.trim() || el.textContent?.trim();
            const typeText = el.querySelector('.io-type')?.textContent?.replace(':', '').trim();
            const isExecPin = (typeText === 'Exec' || label === 'Exec' || typeText === 'exec' || label === 'exec');
            el.classList.remove('valid-target');
            if ((lookingForExec && isExecPin) || (!lookingForExec && !isExecPin)) {
                el.classList.add('valid-target');
            }
        });
    }

    function clearHighlights() {
        log('Clearing highlights');
        document.querySelectorAll('.io.valid-target').forEach(el => el.classList.remove('valid-target'));
    }

    function connKey(conn) {
        return `${conn.from?.nodeId ?? ''}:${conn.from?.output ?? ''}->${conn.to?.nodeId ?? ''}:${conn.to?.input ?? ''}`;
    }

    function onIOContextMenu(type, io, event) {
        event.preventDefault();
        log('Opening IO context menu', { type, io, nodeId: props.node.id });
        emit('io-context-menu', {
            nodeId: props.node.id,
            type,
            ioName: io.name || io,
            event
        });
    }

    // Always use ioPositions for connection points, never DOM queries
    function getConnectionPoints(conn) {
        if (!conn.from || !conn.to) return null;
        const from = ioPositions.value[conn.from.nodeId]?.outputs?.[conn.from.output];
        const to = ioPositions.value[conn.to.nodeId]?.inputs?.[conn.to.input];
        if (!from || !to) return null;
        return {
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y
        };
    }

    function finishConnect(e) {
        log('finishConnect', { connecting, mouseX: e.clientX, mouseY: e.clientY });
        if (connecting) {
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            let found = null;
            document.querySelectorAll('.io.input, .io.output').forEach((el) => {
                const rect = el.getBoundingClientRect();
                if (
                    mouseX >= rect.left && mouseX <= rect.right &&
                    mouseY >= rect.top && mouseY <= rect.bottom
                ) {
                    const isInput = el.classList.contains('input');
                    const type = isInput ? 'input' : 'output';
                    let nodeEl = el.closest('[data-node-id]');
                    let nodeId = nodeEl ? Number(nodeEl.getAttribute('data-node-id')) : undefined;
                    let ioName = el.querySelector('.io-label')?.textContent?.trim() || el.textContent?.trim();
                    found = { type, nodeId, ioName };
                    log('finishConnect foundIO', found);
                }
            });
            if (found && found.nodeId !== undefined) {
                log('finishConnect found valid node', found);
                if (
                    (connecting.type === 'output' && found.type === 'input') ||
                    (connecting.type === 'input' && found.type === 'output')
                ) {
                    const isExec = (x) => {
                        if (!x) return false;
                        if (typeof x === 'string') return x.trim().toLowerCase() === 'exec';
                        if (typeof x === 'object' && x.type) return String(x.type).trim().toLowerCase() === 'exec';
                        return false;
                    };
                    if (
                        (isExec(found.ioName) && isExec(connecting.name)) ||
                        (!isExec(found.ioName) && !isExec(connecting.name))
                    ) {
                        if (connecting.type === 'output') {
                            emit('connect', {
                                from: { nodeId: props.node.id, output: connecting.name },
                                to: { nodeId: found.nodeId, input: found.ioName },
                            });
                        } else {
                            emit('connect', {
                                from: { nodeId: found.nodeId, output: found.ioName },
                                to: { nodeId: props.node.id, input: connecting.name },
                            });
                        }
                    }
                }
            }
        }
        connecting = null;
        clearHighlights();
        window.removeEventListener('mouseup', finishConnect);
    }

    // Register IO positions after mount and after every move/resize
    function registerAllIO() {
        nextTick(() => {
            registerAllIOForNode(props.node, nodeRef.value);
        });
    }

    // Register IO positions on mount
    onMounted(() => {
        registerAllIO();
    });
    // Clean up listeners on unmount
    onBeforeUnmount(() => {
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
        window.removeEventListener('mouseup', finishConnect);
    });

    function renderDebugMarkers() {
        return null;
    }

    return {
        nodeRef,
        registerAllIO,
        startDrag,
        onDrag,
        stopDrag,
        startConnect,
        connKey,
        onIOContextMenu,
        getConnectionPoints,
        renderDebugMarkers,
    };
}

export const debugMode = ref(true);

export function log(...args) {
  if (debugMode.value) {
    console.log('[DEBUG]', ...args);
  }
}

export function getIOPosition(nodeId, ioType, ioName) {
    const nodeIO = ioPositions.value[nodeId];
    if (!nodeIO) return null;
    const ioGroup = ioType === 'input' ? nodeIO.inputs : nodeIO.outputs;
    if (!ioGroup) return null;
    return ioGroup[ioName] || null;
}

// ===== UNIVERSAL PROGRAMMING NODE CREATION FUNCTIONS =====

/**
 * Add a node from a definition ID
 */
export function addNodeFromDefinition(nodeDefId, position = { x: 200, y: 200 }) {
    console.log('addNodeFromDefinition called with:', nodeDefId, position);
    
    // Get the definition first to verify it exists
    const definition = getNodeDefinition(nodeDefId);
    console.log('getNodeDefinition returned:', definition);
    
    if (!definition) {
        console.warn(`Failed to create node with definition ID: ${nodeDefId}`);
        return null;
    }
    
    // Create the node using the node ID (createNodeFromDefinition expects ID, not definition object)
    const newNode = createNodeFromDefinition(nodeDefId, position.x, position.y);
    
    if (newNode) {
        nodes.value.push(newNode);
        console.log('Added node:', newNode);
        return newNode;
    }
    
    console.warn(`Failed to create node with definition ID: ${nodeDefId}`);
    return null;
}

/**
 * Add a bitwise operation node
 */
export function addBitwiseNode(operation = 'bitwise_and', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add an exception handling node
 */
export function addExceptionNode(type = 'try_catch', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(type, position);
}

/**
 * Add a memory operation node
 */
export function addMemoryNode(operation = 'is_null', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add an advanced math node
 */
export function addAdvancedMathNode(operation = 'sin', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add an advanced string operation node
 */
export function addAdvancedStringNode(operation = 'split', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add an advanced array operation node
 */
export function addAdvancedArrayNode(operation = 'array_filter', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add an object operation node
 */
export function addObjectNode(operation = 'object_get', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add a functional programming node
 */
export function addFunctionalNode(operation = 'lambda', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add an I/O operation node
 */
export function addIONode(operation = 'file_read', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add a time operation node
 */
export function addTimeNode(operation = 'current_time', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add a network operation node
 */
export function addNetworkNode(operation = 'http_get', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add a casting node
 */
export function addCastNode(operation = 'to_string', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add a comparison/logic node
 */
export function addComparisonNode(operation = 'equals', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add a control flow node
 */
export function addControlNode(operation = 'if', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add a math operation node
 */
export function addMathNode(operation = 'add', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add a string operation node
 */
export function addStringNode(operation = 'concat', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Add an array operation node
 */
export function addArrayNode(operation = 'array_push', position = { x: 200, y: 200 }) {
    return addNodeFromDefinition(operation, position);
}

/**
 * Quick access function to create common node patterns
 */
export function addNodePattern(patternType, startPosition = { x: 200, y: 200 }) {
    const spacing = { x: 250, y: 150 };
    const nodes = [];
    
    switch (patternType) {
        case 'data_processing':
            nodes.push(addStringNode('trim', startPosition));
            nodes.push(addAdvancedStringNode('split', { x: startPosition.x + spacing.x, y: startPosition.y }));
            nodes.push(addAdvancedArrayNode('array_filter', { x: startPosition.x + spacing.x * 2, y: startPosition.y }));
            break;
            
        case 'exception_handling':
            nodes.push(addExceptionNode('try_catch', startPosition));
            nodes.push(addIONode('file_read', { x: startPosition.x + spacing.x, y: startPosition.y }));
            nodes.push(addNetworkNode('json_decode', { x: startPosition.x + spacing.x * 2, y: startPosition.y }));
            break;
            
        case 'functional_programming':
            nodes.push(addFunctionalNode('lambda', startPosition));
            nodes.push(addAdvancedArrayNode('array_map', { x: startPosition.x + spacing.x, y: startPosition.y }));
            nodes.push(addAdvancedArrayNode('array_reduce', { x: startPosition.x + spacing.x * 2, y: startPosition.y }));
            break;
            
        case 'system_programming':
            nodes.push(addMemoryNode('sizeof', startPosition));
            nodes.push(addBitwiseNode('bitwise_and', { x: startPosition.x + spacing.x, y: startPosition.y }));
            nodes.push(addTimeNode('timer_start', { x: startPosition.x + spacing.x * 2, y: startPosition.y }));
            break;
            
        case 'network_programming':
            nodes.push(addObjectNode('object_set', startPosition));
            nodes.push(addNetworkNode('json_encode', { x: startPosition.x + spacing.x, y: startPosition.y }));
            nodes.push(addNetworkNode('http_post', { x: startPosition.x + spacing.x * 2, y: startPosition.y }));
            break;
            
        default:
            console.warn(`Unknown pattern type: ${patternType}`);
    }
    
    return nodes;
}
