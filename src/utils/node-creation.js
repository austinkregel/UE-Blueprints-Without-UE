import {nodes} from './state.js';
import {createNodeFromDefinition, createVariableNode} from './node-factory.js';
import {getNodeDefinition} from './language-definition.js';
import {getNextNodeId} from './id-utils.js';

// ===== UNIVERSAL PROGRAMMING NODE CREATION FUNCTIONS =====
export function addNodeFromDefinition(nodeDefId, position = {x: 200, y: 200}) {
    const definition = getNodeDefinition(nodeDefId);
    if (!definition) {
        console.warn(`Failed to create node with definition ID: ${nodeDefId}`);
        return null;
    }
    const newNode = createNodeFromDefinition(nodeDefId, position.x, position.y);
    if (newNode) {
        nodes.value.push(newNode);
        return newNode;
    }
    console.warn(`Failed to create node with definition ID: ${nodeDefId}`);
    return null;
}

export function addBitwiseNode(operation = 'bitwise_and', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addExceptionNode(type = 'try_catch', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(type, position);
}

export function addMemoryNode(operation = 'is_null', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addAdvancedMathNode(operation = 'sin', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addAdvancedStringNode(operation = 'split', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addAdvancedArrayNode(operation = 'array_filter', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addObjectNode(operation = 'object_get', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addFunctionalNode(operation = 'lambda', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addIONode(operation = 'file_read', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addTimeNode(operation = 'current_time', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addNetworkNode(operation = 'http_get', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addCastNode(operation = 'to_string', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addComparisonNode(operation = 'equals', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addControlNode(operation = 'if', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addMathNode(operation = 'add', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addStringNode(operation = 'concat', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

export function addArrayNode(operation = 'array_push', position = {x: 200, y: 200}) {
    return addNodeFromDefinition(operation, position);
}

// Create a variable node and add it to the graph
export function addVariableNode(varName, varType = 'mixed', action = 'get', position = {x: 300, y: 200}) {
    const node = createVariableNode(varName, varType, action, position.x, position.y);
    nodes.value.push(node);
    return node;
}

export function addNodePattern(patternType, startPosition = {x: 200, y: 200}) {
    const spacing = {x: 250, y: 150};
    const added = [];
    switch (patternType) {
        case 'data_processing':
            added.push(addStringNode('trim', startPosition));
            added.push(addAdvancedStringNode('split', {x: startPosition.x + spacing.x, y: startPosition.y}));
            added.push(addAdvancedArrayNode('array_filter', {x: startPosition.x + spacing.x * 2, y: startPosition.y}));
            break;
        case 'exception_handling':
            added.push(addExceptionNode('try_catch', startPosition));
            added.push(addIONode('file_read', {x: startPosition.x + spacing.x, y: startPosition.y}));
            added.push(addNetworkNode('json_decode', {x: startPosition.x + spacing.x * 2, y: startPosition.y}));
            break;
        case 'functional_programming':
            added.push(addFunctionalNode('lambda', startPosition));
            added.push(addAdvancedArrayNode('array_map', {x: startPosition.x + spacing.x, y: startPosition.y}));
            added.push(addAdvancedArrayNode('array_reduce', {x: startPosition.x + spacing.x * 2, y: startPosition.y}));
            break;
        case 'system_programming':
            added.push(addMemoryNode('sizeof', startPosition));
            added.push(addBitwiseNode('bitwise_and', {x: startPosition.x + spacing.x, y: startPosition.y}));
            added.push(addTimeNode('timer_start', {x: startPosition.x + spacing.x * 2, y: startPosition.y}));
            break;
        case 'network_programming':
            added.push(addObjectNode('object_set', startPosition));
            added.push(addNetworkNode('json_encode', {x: startPosition.x + spacing.x, y: startPosition.y}));
            added.push(addNetworkNode('http_post', {x: startPosition.x + spacing.x * 2, y: startPosition.y}));
            break;
        default:
            console.warn(`Unknown pattern type: ${patternType}`);
    }
    return added;
}

// ===== EXECUTION FLOW CONTROL NODE CREATION FUNCTIONS =====
export function addExecFlowNode(nodeDefId = 'sequence', position = {x: 200, y: 200}) {
    const newNode = createNodeFromDefinition(nodeDefId, position.x, position.y, {
        id: getNextNodeId('exec'),
        type: 'exec',
        nodeDefId
    });
    nodes.value.push(newNode);
    return newNode;
}

export function addSequenceNode(position = {x: 200, y: 200}) {
    return addExecFlowNode('sequence', position);
}

export function addBranchNode(position = {x: 200, y: 200}) {
    return addExecFlowNode('branch', position);
}

export function addGateNode(position = {x: 200, y: 200}) {
    return addExecFlowNode('gate', position);
}

export function addMultigateNode(position = {x: 200, y: 200}) {
    return addExecFlowNode('multigate', position);
}

export function addDoOnceNode(position = {x: 200, y: 200}) {
    return addExecFlowNode('do_once', position);
}

export function addDoNNode(position = {x: 200, y: 200}) {
    return addExecFlowNode('do_n', position);
}

export function addDelayNode(position = {x: 200, y: 200}) {
    return addExecFlowNode('delay', position);
}

export function addFlipFlopNode(position = {x: 200, y: 200}) {
    return addExecFlowNode('flip_flop', position);
}

export function addForLoopNode(position = {x: 200, y: 200}) {
    return addExecFlowNode('for_loop', position);
}

export function addForEachLoopNode(position = {x: 200, y: 200}) {
    return addExecFlowNode('for_each_loop', position);
}

export function addWhileLoopNode(position = {x: 200, y: 200}) {
    return addExecFlowNode('while_loop', position);
}

export function addExecFlowPattern(patternType, startPosition = {x: 100, y: 100}) {
    const spacing = {x: 200, y: 150};
    const added = [];
    switch (patternType) {
        case 'sequential_execution':
            added.push(addSequenceNode(startPosition));
            added.push(addDelayNode({x: startPosition.x + spacing.x, y: startPosition.y}));
            added.push(addSequenceNode({x: startPosition.x + spacing.x * 2, y: startPosition.y}));
            break;
        case 'conditional_flow':
            added.push(addBranchNode(startPosition));
            added.push(addGateNode({x: startPosition.x + spacing.x, y: startPosition.y - spacing.y / 2}));
            added.push(addDoOnceNode({x: startPosition.x + spacing.x, y: startPosition.y + spacing.y / 2}));
            break;
        case 'loop_patterns':
            added.push(addForLoopNode(startPosition));
            added.push(addForEachLoopNode({x: startPosition.x, y: startPosition.y + spacing.y}));
            added.push(addWhileLoopNode({x: startPosition.x + spacing.x, y: startPosition.y}));
            break;
        case 'multi_routing':
            added.push(addMultigateNode(startPosition));
            added.push(addFlipFlopNode({x: startPosition.x + spacing.x, y: startPosition.y}));
            added.push(addDoNNode({x: startPosition.x + spacing.x * 2, y: startPosition.y}));
            break;
        default:
            console.warn(`Unknown exec flow pattern: ${patternType}`);
    }
    return added;
}

export {getNextNodeId};
