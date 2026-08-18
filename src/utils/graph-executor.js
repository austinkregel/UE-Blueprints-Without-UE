/**
 * Graph Execution Engine
 *
 * This module handles the execution of node graphs, following execution flow
 * from start nodes through the connected execution pins.
 */

import { computed, ref } from 'vue';
import { nodes } from './state.js';
import { getConnections } from './connection-manager.js';
// Execution state
export const isExecuting = ref(false);
export const executionResults = ref(new Map());
export const executionLog = ref([]);
export const currentExecutionStep = ref(0);
export const configuredEntryPoints = ref(new Set()); // User-configured entry points
export const eventListeners = ref(new Map()); // Event name -> array of listener node IDs
export const activeEvents = ref(new Map()); // Event instances with data

// Execution history for debugging
export const executionHistory = ref([]);

// Track nodes currently being evaluated (to prevent cycles)
const _evaluatingData = new Set();

/**
 * Find all entry points (nodes that can start execution)
 */
function findEntryPoints() {
    const entryPoints = [];

    // First, check for user-configured entry points
    configuredEntryPoints.value.forEach((nodeId) => {
        const node = nodes.value.find((n) => n.id === nodeId);
        if (node) {
            entryPoints.push(node);
        }
    });

    // If no configured entry points, look for traditional entry points
    if (entryPoints.length === 0) {
        nodes.value.forEach((node) => {
            // Look for nodes that are typically entry points
            if (
                node.nodeDefId === 'on_start' ||
                node.nodeDefId === 'on_key_press' ||
                (node.type === 'system' && node.systemName?.startsWith('on_'))
            ) {
                entryPoints.push(node);
            }

            // Also consider nodes with exec outputs but no exec inputs as potential entry points
            const hasExecOutput = node.outputs?.some((output) => output.type === 'exec');
            const hasExecInput = node.inputs?.some((input) => input.type === 'exec');

            if (hasExecOutput && !hasExecInput) {
                entryPoints.push(node);
            }
        });
    }

    return entryPoints;
}

/**
 * Find all connections coming from a specific node's output
 */
function findConnectionsFromOutput(nodeId, outputName) {
    return getConnections().filter((conn) => conn.from && conn.from.nodeId === nodeId && conn.from.output === outputName);
}

/**
 * Find all connections going to a specific node's input
 */
function findConnectionsToInput(nodeId, inputName) {
    return getConnections().filter((conn) => conn.to && conn.to.nodeId === nodeId && conn.to.input === inputName);
}

/**
 * Get the value for a node's input from connected outputs
 */
async function getInputValue(nodeId, inputName) {
    const key = `${nodeId}.${inputName}`;
    if (inputOverrides.value.has(key)) {
        return inputOverrides.value.get(key);
    }
    const inputConnections = findConnectionsToInput(nodeId, inputName);

    if (inputConnections.length === 0) {
        // No connection, check for default value
        const node = nodes.value.find((n) => n.id === nodeId);
        const input = node?.inputs?.find((inp) => inp.name === inputName);
        return input?.defaultValue ?? null;
    }

    // Get value from connected output
    const connection = inputConnections[0]; // Take first connection
    const sourceNodeId = connection.from.nodeId;
    const sourceOutput = connection.from.output;

    // If source node hasn't produced results yet, lazily evaluate it (data-only)
    if (!executionResults.value.has(sourceNodeId)) {
        await evaluateNodeData(sourceNodeId);
    }

    const sourceResults = executionResults.value.get(sourceNodeId);
    return sourceResults?.[sourceOutput] ?? null;
}

/**
 * Lazily evaluate a node for data (no exec traversal)
 */
async function evaluateNodeData(nodeId) {
    if (_evaluatingData.has(nodeId)) return; // prevent recursion loops
    _evaluatingData.add(nodeId);
    try {
        const node = nodes.value.find((n) => n.id === nodeId);
        if (!node) return;
        // If already computed, skip
        if (executionResults.value.has(node.id)) return;
        // Execute only this node to compute its data outputs
        const results = await executeNode(node);
        executionResults.value.set(node.id, results);
    } finally {
        _evaluatingData.delete(nodeId);
    }
}

/**
 * Execute a single node and return its outputs
 */
async function executeNode(node) {
    const nodeResults = {};

    // Log execution
    const logEntry = {
        step: currentExecutionStep.value++,
        nodeId: node.id,
        nodeType: node.type,
        nodeDefId: node.nodeDefId,
        timestamp: Date.now()
    };

    try {
        // Collect input values
        const inputValues = {};
        if (node.inputs) {
            for (const input of node.inputs) {
                if (input.type !== 'exec') {
                    inputValues[input.name] = await getInputValue(node.id, input.name);
                }
            }
        }
        emitExecutionEvent({ type: 'node-start', nodeId: node.id, inputs: inputValues });
        // Execute based on node type
        switch (node.nodeDefId || node.type) {
            case 'print': {
                const printValue = inputValues.value || inputValues.text || 'undefined';
                console.log(`[Graph Execution] Print: ${printValue}`);
                executionLog.value.push(`Print: ${printValue}`);
                nodeResults.result = printValue;
                break;
            }

            case 'add': {
                const a = parseFloat(inputValues.a || inputValues.A || 0);
                const b = parseFloat(inputValues.b || inputValues.B || 0);
                const sum = a + b;
                nodeResults.result = sum;
                console.log(`[Graph Execution] Add: ${a} + ${b} = ${sum}`);
                break;
            }

            case 'subtract': {
                const subA = parseFloat(inputValues.a || inputValues.A || 0);
                const subB = parseFloat(inputValues.b || inputValues.B || 0);
                const diff = subA - subB;
                nodeResults.result = diff;
                console.log(`[Graph Execution] Subtract: ${subA} - ${subB} = ${diff}`);
                break;
            }

            case 'multiply': {
                const mulA = parseFloat(inputValues.a || inputValues.A || 0);
                const mulB = parseFloat(inputValues.b || inputValues.B || 0);
                const product = mulA * mulB;
                nodeResults.result = product;
                console.log(`[Graph Execution] Multiply: ${mulA} * ${mulB} = ${product}`);
                break;
            }

            case 'divide': {
                const divA = parseFloat(inputValues.a || inputValues.A || 0);
                const divB = parseFloat(inputValues.b || inputValues.B || 1);
                const quotient = divB !== 0 ? divA / divB : NaN;
                nodeResults.result = quotient;
                console.log(`[Graph Execution] Divide: ${divA} / ${divB} = ${quotient}`);
                break;
            }

            case 'if':
            case 'branch': {
                const condition = Boolean(inputValues.condition);
                console.log(`[Graph Execution] Branch: condition = ${condition}`);
                // Branch nodes don't produce data outputs, they control execution flow
                break;
            }

            case 'sequence':
                console.log(`[Graph Execution] Sequence: executing in order`);
                // Sequence nodes just control execution flow
                break;

            case 'delay': {
                const duration = parseFloat(inputValues.Duration || inputValues.duration || 1.0);
                console.log(`[Graph Execution] Delay: waiting ${duration}s`);
                await new Promise((resolve) => setTimeout(resolve, duration * 1000));
                break;
            }

            case 'variable':
                // Variable nodes output their stored value
                nodeResults[node.varName] = node.varValue || node.defaultValue || null;
                console.log(`[Graph Execution] Variable ${node.varName}: ${nodeResults[node.varName]}`);
                break;

            case 'emit_event': {
                // Event emission node
                const eventName = inputValues.eventName || inputValues.name || 'CustomEvent';
                const eventData = inputValues.data || {};
                emitEvent(eventName, eventData);
                nodeResults.eventName = eventName;
                break;
            }

            case 'on_event': {
                // Event listener node - gets data from the event system
                const listenEventName = node.eventName || inputValues.eventName || 'CustomEvent';
                const eventInfo = activeEvents.value.get(listenEventName);
                if (eventInfo) {
                    nodeResults.eventData = eventInfo.data;
                    nodeResults.eventName = eventInfo.name;
                    nodeResults.timestamp = eventInfo.timestamp;
                }
                console.log(`[Graph Execution] Event listener for '${listenEventName}'`);
                break;
            }

            default:
                console.log(`[Graph Execution] Unknown node type: ${node.nodeDefId || node.type}`);
                // For unknown nodes, just pass through any connected values
                Object.keys(inputValues).forEach((key) => {
                    nodeResults[key] = inputValues[key];
                });
        }

        logEntry.outputs = nodeResults;
        logEntry.success = true;
    } catch (error) {
        console.error(`[Graph Execution] Error executing node ${node.id}:`, error);
        logEntry.error = error.message;
        logEntry.success = false;
        emitExecutionEvent({ type: 'node-end', nodeId: node.id, error: error.message, success: false });
    }

    executionHistory.value.push(logEntry);
    executionResults.value.set(node.id, nodeResults);

    return nodeResults;
}

// === Interactive Execution Controls & Events ===
export const stepMode = ref(false); // when true, pause before each node
export const isPaused = ref(false); // manual pause
export const breakpoints = ref(new Set()); // nodeId set
export const executionEvents = ref([]); // stream of events for UI overlays

let _gateResolve = null;
const _listeners = [];

export function onExecutionEvent(listener) {
    _listeners.push(listener);
    return () => {
        const i = _listeners.indexOf(listener);
        if (i >= 0) _listeners.splice(i, 1);
    };
}

function emitExecutionEvent(evt) {
    const withTime = { time: Date.now(), ...evt };
    executionEvents.value.push(withTime);
    // Cap buffer to avoid unbounded growth
    if (executionEvents.value.length > 2000) executionEvents.value.shift();
    _listeners.forEach((fn) => {
        try {
            fn(withTime);
        } catch (_) {}
    });
}

async function executionGate(node) {
    const hitBp = breakpoints.value.has(node.id);
    if (stepMode.value || isPaused.value || hitBp) {
        emitExecutionEvent({
            type: 'paused',
            nodeId: node.id,
            reason: hitBp ? 'breakpoint' : isPaused.value ? 'paused' : 'step'
        });
        await new Promise((resolve) => {
            _gateResolve = resolve;
        });
    }
}

export function setStepMode(enabled) {
    stepMode.value = !!enabled;
}

export function pauseInteractive() {
    isPaused.value = true;
}

export function resumeInteractive() {
    isPaused.value = false;
    if (_gateResolve) {
        const r = _gateResolve;
        _gateResolve = null;
        r();
    }
}

export function stepOnce() {
    if (_gateResolve) {
        const r = _gateResolve;
        _gateResolve = null;
        r();
    }
}

export function toggleBreakpoint(nodeId) {
    if (breakpoints.value.has(nodeId)) breakpoints.value.delete(nodeId);
    else breakpoints.value.add(nodeId);
}

export function clearBreakpoints() {
    breakpoints.value.clear();
}

/**
 * Execute the next nodes in the execution flow
 */
async function executeNextNodes(nodeId, outputName = null) {
    const connections = outputName
        ? findConnectionsFromOutput(nodeId, outputName)
        : findConnectionsFromOutput(nodeId, 'Exec') || findConnectionsFromOutput(nodeId, 'exec');
    // Emit edge traversal intentions
    for (const c of connections) {
        emitExecutionEvent({
            type: 'edge-traverse',
            from: { nodeId: c.from.nodeId, output: c.from.output },
            to: { nodeId: c.to.nodeId, input: c.to.input }
        });
    }
    // Execute all connected nodes in parallel for data flow
    // Execute sequentially for execution flow
    const executions = [];

    for (const connection of connections) {
        const targetNodeId = connection.to.nodeId;
        const targetNode = nodes.value.find((n) => n.id === targetNodeId);

        if (targetNode) {
            if (connection.to.input === 'Exec' || connection.to.input === 'exec') {
                // Execution flow - wait for completion
                await executeNodeFlow(targetNode);
            } else {
                // Data flow - can be parallel
                executions.push(executeNodeFlow(targetNode));
            }
        }
    }

    // Wait for any remaining parallel executions
    await Promise.all(executions);
}

/**
 * Execute a node and its flow
 */
async function executeNodeFlow(node) {
    // Check if node has already been executed in this run
    if (executionResults.value.has(node.id)) {
        return;
    }
    // Gate here for step/pause/breakpoint
    await executionGate(node);
    // Execute the node
    await executeNode(node);

    // Handle special execution flow control
    switch (node.nodeDefId) {
        case 'sequence': {
            // Execute outputs in order: Then 0, Then 1, Then 2, etc.
            const sequenceOutputs = node.outputs?.filter((output) => output.type === 'exec') || [];
            for (const output of sequenceOutputs) {
                await executeNextNodes(node.id, output.name);
            }
            break;
        }

        case 'branch':
        case 'if': {
            // Execute True or False branch based on condition
            const condition = Boolean(await getInputValue(node.id, 'condition'));
            const branchOutput = condition ? 'True' : 'False';
            await executeNextNodes(node.id, branchOutput);
            break;
        }

        case 'delay':
            // After delay, continue execution
            await executeNextNodes(node.id, 'Completed');
            break;

        default: {
            // For other nodes, follow all exec outputs
            const execOutputs = node.outputs?.filter((output) => output.type === 'exec') || [];
            if (execOutputs.length > 0) {
                for (const output of execOutputs) {
                    await executeNextNodes(node.id, output.name);
                }
            } else {
                // No exec outputs, try to continue with generic exec flow
                await executeNextNodes(node.id);
            }
        }
    }
}

/**
 * Start graph execution
 */
export async function executeGraph() {
    if (isExecuting.value) {
        console.warn('Graph execution already in progress');
        return;
    }

    console.log('🚀 Starting graph execution...');
    isExecuting.value = true;
    executionResults.value.clear();
    executionLog.value = [];
    executionHistory.value = [];
    currentExecutionStep.value = 0;

    // Auto-register event listeners
    registerEventListeners();

    try {
        // Find entry points
        const entryPoints = findEntryPoints();

        if (entryPoints.length === 0) {
            console.warn('No entry points found. Looking for nodes with exec outputs...');
            // If no obvious entry points, start with any node that has exec outputs
            const startNodes = nodes.value.filter((node) => node.outputs?.some((output) => output.type === 'exec'));

            if (startNodes.length > 0) {
                console.log(`Found ${startNodes.length} potential start nodes`);
                entryPoints.push(...startNodes.slice(0, 1)); // Take the first one
            }
        }

        if (entryPoints.length === 0) {
            throw new Error('No executable nodes found. Add nodes with execution flow (exec pins) to run the graph.');
        }

        console.log(
            `Found ${entryPoints.length} entry points:`,
            entryPoints.map((n) => n.nodeDefId || n.type)
        );

        // Execute from all entry points
        for (const entryPoint of entryPoints) {
            console.log(`Starting execution from: ${entryPoint.nodeDefId || entryPoint.type} (ID: ${entryPoint.id})`);
            await executeNodeFlow(entryPoint);
        }

        console.log('✅ Graph execution completed');
        console.log(`Executed ${executionHistory.value.length} nodes`);
        console.log('Execution log:', executionLog.value);
    } catch (error) {
        console.error('❌ Graph execution failed:', error);
        executionLog.value.push(`Error: ${error.message}`);
    } finally {
        isExecuting.value = false;
    }
}

/**
 * Stop graph execution
 */
export function stopExecution() {
    isExecuting.value = false;
    // Also release any pending gate so UI doesn't hang
    if (_gateResolve) {
        const r = _gateResolve;
        _gateResolve = null;
        r();
    }
    console.log('🛑 Graph execution stopped');
}

/**
 * Clear execution results
 */
export function clearExecutionResults() {
    executionResults.value.clear();
    executionLog.value = [];
    executionHistory.value = [];
    currentExecutionStep.value = 0;
    activeEvents.value.clear();
}

/**
 * Get execution status for a specific node
 */
export function getNodeExecutionStatus(nodeId) {
    const hasResults = executionResults.value.has(nodeId);
    const historyEntry = executionHistory.value.find((entry) => entry.nodeId === nodeId);

    return {
        executed: hasResults,
        success: historyEntry?.success ?? null,
        error: historyEntry?.error ?? null,
        results: executionResults.value.get(nodeId) ?? null,
        step: historyEntry?.step ?? null
    };
}

/**
 * Get formatted execution summary
 */
export const executionSummary = computed(() => {
    const totalNodes = nodes.value.length;
    const executedNodes = executionResults.value.size;
    const errors = executionHistory.value.filter((entry) => !entry.success).length;

    return {
        totalNodes,
        executedNodes,
        errors,
        isComplete: !isExecuting.value && executedNodes > 0,
        logEntries: executionLog.value.length
    };
});

/**
 * Entry Point Management
 */
export function addEntryPoint(nodeId) {
    configuredEntryPoints.value.add(nodeId);
    console.log(`Added entry point: node ${nodeId}`);
}

export function removeEntryPoint(nodeId) {
    configuredEntryPoints.value.delete(nodeId);
    console.log(`Removed entry point: node ${nodeId}`);
}

export function isEntryPoint(nodeId) {
    return configuredEntryPoints.value.has(nodeId);
}

export function clearEntryPoints() {
    configuredEntryPoints.value.clear();
    console.log('Cleared all entry points');
}

/**
 * Event System
 */
export function emitEvent(eventName, eventData = {}) {
    console.log(`📡 Emitting event: ${eventName}`, eventData);

    // Store the event data
    activeEvents.value.set(eventName, {
        name: eventName,
        data: eventData,
        timestamp: Date.now()
    });

    // Find all listeners for this event
    const listeners = eventListeners.value.get(eventName) || [];

    // Execute all listener nodes
    listeners.forEach(async (nodeId) => {
        const node = nodes.value.find((n) => n.id === nodeId);
        if (node) {
            console.log(`🎯 Triggering event listener: ${node.nodeDefId || node.type} (${nodeId})`);

            // Set the event data as available to the node
            const nodeResults = executionResults.value.get(nodeId) || {};
            nodeResults.eventData = eventData;
            nodeResults.eventName = eventName;
            executionResults.value.set(nodeId, nodeResults);

            // Execute the listener node
            await executeNodeFlow(node);
        }
    });

    executionLog.value.push(`Event emitted: ${eventName}`);
}

export function addEventListener(eventName, nodeId) {
    if (!eventListeners.value.has(eventName)) {
        eventListeners.value.set(eventName, []);
    }

    const listeners = eventListeners.value.get(eventName);
    if (!listeners.includes(nodeId)) {
        listeners.push(nodeId);
        console.log(`➕ Added event listener for '${eventName}': node ${nodeId}`);
    }
}

export function removeEventListener(eventName, nodeId) {
    const listeners = eventListeners.value.get(eventName);
    if (listeners) {
        const index = listeners.indexOf(nodeId);
        if (index > -1) {
            listeners.splice(index, 1);
            console.log(`➖ Removed event listener for '${eventName}': node ${nodeId}`);

            // Clean up empty listener arrays
            if (listeners.length === 0) {
                eventListeners.value.delete(eventName);
            }
        }
    }
}

export function getEventListeners(eventName) {
    return eventListeners.value.get(eventName) || [];
}

export function getAllEvents() {
    return Array.from(eventListeners.value.keys());
}

/**
 * Auto-register event listeners for "on_event" nodes
 */
export function registerEventListeners() {
    // Clear existing listeners
    eventListeners.value.clear();

    // Find all "on_event" nodes and register them as listeners
    nodes.value.forEach((node) => {
        if (node.nodeDefId === 'on_event') {
            // Get the event name from the node's inputs or properties
            let eventName = 'CustomEvent'; // default

            if (node.inputs) {
                const eventNameInput = node.inputs.find((input) => input.name === 'eventName');
                if (eventNameInput && eventNameInput.defaultValue) {
                    eventName = eventNameInput.defaultValue;
                }
            }

            // Also check if the node has an eventName property
            if (node.eventName) {
                eventName = node.eventName;
            }

            addEventListener(eventName, node.id);
        }
    });
}

/**
 * Call this whenever nodes change to update event listeners
 */
export function updateEventListeners() {
    registerEventListeners();
}

export async function executeFromEntryPoint(nodeId) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node) {
        throw new Error(`Entry point node ${nodeId} not found`);
    }

    console.log(`🚀 Starting execution from entry point: ${node.nodeDefId || node.type} (${nodeId})`);

    isExecuting.value = true;
    executionResults.value.clear();
    executionLog.value = [];
    executionHistory.value = [];
    currentExecutionStep.value = 0;

    try {
        await executeNodeFlow(node);
        console.log('✅ Entry point execution completed');
    } catch (error) {
        console.error('❌ Entry point execution failed:', error);
        executionLog.value.push(`Error: ${error.message}`);
    } finally {
        isExecuting.value = false;
    }
}

// Allow external input overrides for evaluation
export const inputOverrides = ref(new Map()); // key: `${nodeId}.${inputName}` -> value

export function setInputOverrides(overrides) {
    inputOverrides.value.clear();
    if (!overrides) return;
    if (overrides instanceof Map) {
        overrides.forEach((v, k) => inputOverrides.value.set(String(k), v));
        return;
    }
    // Support nested object: { [nodeId]: { [inputName]: value } }
    Object.entries(overrides).forEach(([nid, inputs]) => {
        if (inputs && typeof inputs === 'object') {
            Object.entries(inputs).forEach(([iname, val]) => {
                inputOverrides.value.set(`${nid}.${iname}`, val);
            });
        }
    });
}

export function clearInputOverrides() {
    inputOverrides.value.clear();
}

// === Validation & Evaluation API ===
function isExecType(t) {
    return String(t || '').toLowerCase() === 'exec';
}

function inferDataSinks() {
    const sinks = [];
    for (const n of nodes.value) {
        for (const out of n.outputs || []) {
            if (isExecType(out.type)) continue;
            const hasOutgoing = getConnections().some((c) => c.from?.nodeId === n.id && c.from.output === (out.name || out));
            if (!hasOutgoing) sinks.push({ nodeId: n.id, output: out.name || out });
        }
    }
    return sinks;
}

function normalizeSinks(sinks) {
    if (!sinks || sinks.length === 0) return inferDataSinks();
    return sinks.map((s) => {
        if (typeof s === 'string') {
            const [nid, out] = s.split('.');
            return { nodeId: Number(nid), output: out };
        }
        return s;
    });
}

export function validateGraphInputs({ sinks = null, overrides = null } = {}) {
    const errs = [];
    const warns = [];
    const sinkList = normalizeSinks(sinks);
    // Build set of nodes relevant to sinks (backward slice)
    const neededNodes = new Set();
    const neededInputs = new Set(); // keys `${nodeId}.${inputName}`
    const queue = [...sinkList.map((s) => ({ nodeId: s.nodeId, output: s.output }))];
    while (queue.length) {
        const { nodeId } = queue.pop();
        neededNodes.add(nodeId);
        // For each input of this node, mark as needed and enqueue sources
        const node = nodes.value.find((n) => n.id === nodeId);
        if (!node) continue;
        for (const inp of node.inputs || []) {
            if (isExecType(inp.type)) continue;
            neededInputs.add(`${nodeId}.${inp.name}`);
            const incoming = findConnectionsToInput(nodeId, inp.name);
            if (incoming.length > 0) {
                const src = incoming[0].from;
                queue.push({ nodeId: src.nodeId, output: src.output });
            }
        }
    }

    // Prepare overrides map for checks
    const ov = new Map();
    if (overrides instanceof Map) {
        overrides.forEach((v, k) => ov.set(String(k), v));
    } else if (overrides && typeof overrides === 'object') {
        Object.entries(overrides).forEach(([nid, o]) => {
            if (o && typeof o === 'object') Object.entries(o).forEach(([iname, v]) => ov.set(`${nid}.${iname}`, v));
        });
    }

    // Check each needed input
    neededInputs.forEach((key) => {
        if (ov.has(key)) return; // provided
        const [nidStr, iname] = key.split('.');
        const nid = Number(nidStr);
        const node = nodes.value.find((n) => n.id === nid);
        const inpDef = node?.inputs?.find((i) => i.name === iname);
        const incoming = findConnectionsToInput(nid, iname);
        if (!incoming.length) {
            if (inpDef && inpDef.defaultValue !== undefined) return; // default ok
            errs.push({ nodeId: nid, input: iname, reason: 'missing_input' });
        } else {
            // Simple type compatibility check
            const srcNode = nodes.value.find((n) => n.id === incoming[0].from.nodeId);
            const outDef = srcNode?.outputs?.find((o) => (o.name || o) === incoming[0].from.output);
            const inType = String(inpDef?.type || 'mixed').toLowerCase();
            const outType = String(outDef?.type || 'mixed').toLowerCase();
            if (inType !== 'mixed' && outType !== 'mixed' && inType !== outType) {
                warns.push({
                    from: { nodeId: incoming[0].from.nodeId, output: incoming[0].from.output, type: outType },
                    to: { nodeId: nid, input: iname, type: inType },
                    reason: 'type_mismatch'
                });
            }
        }
    });

    return { ok: errs.length === 0, errors: errs, warnings: warns, sinks: sinkList };
}

async function evaluatePureDataflow() {
    // Evaluate nodes without exec pins based on data dependencies
    const evaluated = new Set(Array.from(executionResults.value.keys()));
    let progress = true;
    let guard = 0;
    while (progress && guard < nodes.value.length) {
        progress = false;
        guard++;
        for (const node of nodes.value) {
            if (evaluated.has(node.id)) continue;
            const hasExecPins = node.inputs?.some((i) => isExecType(i.type)) || node.outputs?.some((o) => isExecType(o.type));
            if (hasExecPins) continue; // skip, handled by exec flow
            // Check if all inputs are available (override, default, or from evaluated source)
            let ready = true;
            for (const inp of node.inputs || []) {
                if (isExecType(inp.type)) continue;
                const key = `${node.id}.${inp.name}`;
                if (inputOverrides.value.has(key)) continue;
                const incoming = findConnectionsToInput(node.id, inp.name);
                if (!incoming.length) {
                    if (inp.defaultValue === undefined) {
                        ready = false;
                        break;
                    }
                } else {
                    const srcId = incoming[0].from.nodeId;
                    const srcOut = incoming[0].from.output;
                    const srcRes = executionResults.value.get(srcId);
                    if (!srcRes || !(srcOut in srcRes)) {
                        ready = false;
                        break;
                    }
                }
            }
            if (!ready) continue;
            // Evaluate this node
            await executeNode(node);
            evaluated.add(node.id);
            progress = true;
        }
    }
}

export async function evaluateGraphToSinks({ entryPoints = [], overrides = null, sinks = null } = {}) {
    // Set overrides
    setInputOverrides(overrides);

    // Reset state for a fresh evaluation
    executionResults.value.clear();
    executionLog.value = [];
    executionHistory.value = [];
    currentExecutionStep.value = 0;

    // Validate inputs for requested sinks
    const validation = validateGraphInputs({ sinks, overrides });
    if (!validation.ok) {
        return { ok: false, errors: validation.errors, warnings: validation.warnings, outputs: {} };
    }

    // Execute from entry points (exec flow)
    if (entryPoints && entryPoints.length) {
        for (const nid of entryPoints) {
            const node = nodes.value.find((n) => n.id === (typeof nid === 'object' ? nid.nodeId : nid));
            if (node) {
                await executeNodeFlow(node);
            }
        }
    }

    // Then evaluate remaining pure dataflow nodes
    await evaluatePureDataflow();

    // Collect sink outputs
    const outputs = {};
    if (sinks && Object.keys(sinks).length) {
        for (const [alias, locator] of Object.entries(sinks)) {
            const nodeId = typeof locator === 'object' ? locator.nodeId : locator.split('.')[0];
            const outName = typeof locator === 'object' ? locator.output : locator.split('.')[1];
            const res = executionResults.value.get(nodeId) || {};
            outputs[alias] = res[outName];
        }
    }

    return { ok: true, errors: [], warnings: [], outputs };
}
