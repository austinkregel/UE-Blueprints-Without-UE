import { onBeforeUnmount, ref, onMounted, nextTick } from 'vue';

export let dragging = false;
let offset = { x: 0, y: 0 };

import VariableNode from './VariableNode.vue';
import FunctionNode from './FunctionNode.vue';
import NodeBase from './NodeBase.vue';
import SystemNode from './SystemNode.vue';
import { connectNodes } from './connection-utils.js';
import { renderConnectionPath, registerAllIOForNode } from './io-utils.js';
import { connections } from './connection-manager.js';

export const nodes = ref([
    // Example function node
    {
        id: 1,
        type: 'function',
        funcName: 'add',
        hasExec: false,
        x: 100,
        y: 100,
        inputs: [
            { name: 'a', type: 'int' },
            { name: 'b', type: 'int' }
        ],
        outputs: [
            { name: 'result', type: 'int' }
        ]
    },
    // Example variable get node
    {
        id: 2,
        type: 'variable',
        varName: 'counter',
        varType: 'int',
        varAction: 'get',
        x: 350,
        y: 120,
        inputs: [],
        outputs: [
            { name: 'value', type: 'int' }
        ]
    },
    // Example variable set node
    {
        id: 3,
        type: 'variable',
        varName: 'counter',
        varType: 'int',
        varAction: 'set',
        x: 350,
        y: 250,
        inputs: [
            { name: 'value', type: 'int' }
        ],
        outputs: []
    },
    // Example action node (exec)
    {
        id: 4,
        type: 'function',
        funcName: 'print',
        hasExec: true,
        x: 600,
        y: 180,
        inputs: [
            { name: 'Exec', type: 'Exec' },
            { name: 'msg', type: 'string' }
        ],
        outputs: [
            { name: 'Exec', type: 'Exec' }
        ]
    }
]);
export let nextId = 5;
export const ioPositions = ref({}); // { [nodeId]: { inputs: {name: {x,y}}, outputs: {name: {x,y}} } }
export const selectedNodeId = ref(null);
export const draggingConnection = ref(null); // { from: {nodeId, output}, to: {nodeId, input}, type: 'input'|'output', start: {x, y}, mouse: {x, y} }

export function addNode() {
    nodes.value.push({
        id: nextId++,
        type: 'function',
        funcName: 'CustomFunction',
        hasExec: false,
        x: 200,
        y: 200,
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
        draggingConnection.value.mouse = { x: e.clientX, y: e.clientY };
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

        log('Dropping connection on node:',draggingConnection.value?.from?.nodeId, '->', targetNode?.id);
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
                    let ioName = el.querySelector('.io-label')?.textContent?.trim() || el.textContent?.trim();
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
                    const isExec = (x) => x && (x.type === 'Exec' || x === 'Exec' || (x.name || x) === 'Exec');
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
                    const isExec = (x) => x && (x.type === 'Exec' || x === 'Exec' || (x.name || x) === 'Exec');
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
    // If output or input is named 'Exec', treat as action flow
    return (conn.from?.output === 'Exec' || conn.to?.input === 'Exec');
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
        log('Stopping drag for node, deregistering IO positions');
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
                ioTypeForHighlight: io.type || ((io.name || io) === 'Exec' ? 'Exec' : 'data'),
            });
        }
        window.addEventListener('mouseup', finishConnect);
        highlightValidTargets(type, io);
    }

    function highlightValidTargets(type, io) {
        document.querySelectorAll('.io.valid-target').forEach(el => el.classList.remove('valid-target'));
        log('Highlighting valid targets for', { type, io });
        const isExec = (x) => (x.type === 'Exec' || x === 'Exec' || (x.name || x) === 'Exec');
        const lookingForExec = isExec(io);
        document.querySelectorAll('.io.' + (type === 'input' ? 'output' : 'input')).forEach((el) => {
            const label = el.querySelector('.io-label')?.textContent?.trim() || el.textContent?.trim();
            const typeText = el.querySelector('.io-type')?.textContent?.replace(':', '').trim();
            const isExecPin = (typeText === 'Exec' || label === 'Exec');
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
