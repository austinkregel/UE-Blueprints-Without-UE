/**
 * Execution Flow Control Examples
 *
 * This file demonstrates how to use the new execution flow control nodes
 * to create complex execution patterns similar to Unreal Engine Blueprints.
 */

import {
    addBranchNode,
    addDelayNode,
    addDoOnceNode,
    addExecFlowPattern,
    addFlipFlopNode,
    addForEachLoopNode,
    addForLoopNode,
    addGateNode,
    addMultigateNode,
    addSequenceNode,
    addWhileLoopNode
} from './node-creation.js';

import {addSystemNode} from './system-node-utils.js';

// Example 1: Sequential Execution Pattern
export function createSequentialExecutionExample() {
    console.log('=== Sequential Execution Pattern ===');

    const nodes = [];

    // Start node
    const startNode = addSystemNode('on_start', {x: 100, y: 100});

    // Add a sequence node to execute multiple actions in order
    const sequence = addSequenceNode({x: 300, y: 100});

    // Add actions to execute in sequence
    const action1 = addSystemNode('print', {x: 500, y: 50});
    const action2 = addDelayNode({x: 500, y: 100});
    const action3 = addSystemNode('print', {x: 500, y: 150});

    nodes.push(startNode, sequence, action1, action2, action3);

    // Connect the flow
    // startNode.Exec -> sequence.Exec
    // sequence.Then0 -> action1.Exec
    // sequence.Then1 -> action2.Exec
    // sequence.Then2 -> action3.Exec

    console.log('Sequential execution pattern created with', nodes.length, 'nodes');
    console.log('Flow: Start → Sequence → Print → Delay → Print');

    return nodes;
}

// Example 2: Conditional Execution with Branch and Gate
export function createConditionalFlowExample() {
    console.log('=== Conditional Flow Pattern ===');

    const nodes = [];

    // Start node
    const startNode = addSystemNode('on_key_press', {x: 100, y: 100});

    // Branch based on condition
    const branch = addBranchNode({x: 300, y: 100});

    // Gate to control flow
    const gate = addGateNode({x: 500, y: 50});

    // Actions for true/false paths
    const trueAction = addSystemNode('spawn_actor', {x: 700, y: 50});
    const falseAction = addSystemNode('print', {x: 500, y: 150});

    // Do once to prevent repeated execution
    const doOnce = addDoOnceNode({x: 700, y: 100});

    nodes.push(startNode, branch, gate, trueAction, falseAction, doOnce);

    console.log('Conditional flow pattern created with', nodes.length, 'nodes');
    console.log('Flow: KeyPress → Branch → Gate/Print → SpawnActor/DoOnce');

    return nodes;
}

// Example 3: Multi-routing with MultiGate and FlipFlop
export function createMultiRoutingExample() {
    console.log('=== Multi-routing Pattern ===');

    const nodes = [];

    // Trigger event
    const trigger = addSystemNode('on_timer', {x: 100, y: 100});

    // MultiGate to route to different actions
    const multigate = addMultigateNode({x: 300, y: 100});

    // Different actions for each output
    const action1 = addSystemNode('play_sound', {x: 500, y: 50});
    const action2 = addSystemNode('spawn_actor', {x: 500, y: 100});
    const action3 = addSystemNode('destroy_actor', {x: 500, y: 150});

    // FlipFlop for alternating behavior
    const flipFlop = addFlipFlopNode({x: 700, y: 100});
    const actionA = addSystemNode('move_left', {x: 900, y: 75});
    const actionB = addSystemNode('move_right', {x: 900, y: 125});

    nodes.push(trigger, multigate, action1, action2, action3, flipFlop, actionA, actionB);

    console.log('Multi-routing pattern created with', nodes.length, 'nodes');
    console.log('Flow: Timer → MultiGate → Actions → FlipFlop → Move');

    return nodes;
}

// Example 4: Loop Control Patterns
export function createLoopControlExample() {
    console.log('=== Loop Control Pattern ===');

    const nodes = [];

    // Start with initialization
    const init = addSystemNode('on_start', {x: 100, y: 100});

    // For loop for counted iteration
    const forLoop = addForLoopNode({x: 300, y: 50});
    const loopAction1 = addSystemNode('print', {x: 500, y: 50});

    // For each loop for array iteration
    const forEachLoop = addForEachLoopNode({x: 300, y: 150});
    const loopAction2 = addSystemNode('process_item', {x: 500, y: 150});

    // While loop for conditional iteration
    const whileLoop = addWhileLoopNode({x: 300, y: 250});
    const loopAction3 = addSystemNode('check_condition', {x: 500, y: 250});

    nodes.push(init, forLoop, loopAction1, forEachLoop, loopAction2, whileLoop, loopAction3);

    console.log('Loop control pattern created with', nodes.length, 'nodes');
    console.log('Flow: Init → ForLoop/ForEach/While → Actions');

    return nodes;
}

// Example 5: Complex Game Event System
export function createGameEventSystemExample() {
    console.log('=== Complex Game Event System ===');

    const nodes = [];

    // Player input event
    const playerInput = addSystemNode('on_key_press', {x: 100, y: 200});

    // Check if player can act (using gate)
    const canActGate = addGateNode({x: 300, y: 200});

    // Branch based on player state
    const playerStateBranch = addBranchNode({x: 500, y: 200});

    // Sequence for complex action
    const actionSequence = addSequenceNode({x: 700, y: 150});

    // Individual actions in sequence
    const playAnimation = addSystemNode('play_animation', {x: 900, y: 100});
    const playSFX = addSystemNode('play_sound', {x: 900, y: 150});
    const updateUI = addSystemNode('update_ui', {x: 900, y: 200});

    // Delay before allowing next action
    const cooldownDelay = addDelayNode({x: 1100, y: 150});

    // Re-enable the gate
    const enableGate = addSystemNode('enable_gate', {x: 1300, y: 150});

    // Alternative path for when player can't act
    const cantActFeedback = addSystemNode('show_error', {x: 700, y: 250});

    nodes.push(
        playerInput,
        canActGate,
        playerStateBranch,
        actionSequence,
        playAnimation,
        playSFX,
        updateUI,
        cooldownDelay,
        enableGate,
        cantActFeedback
    );

    console.log('Game event system created with', nodes.length, 'nodes');
    console.log('Flow: Input → Gate → Branch → Sequence → Actions → Delay → Re-enable');

    return nodes;
}

// Example 6: Using Exec Flow Patterns
export function createExecFlowPatternsExample() {
    console.log('=== Exec Flow Patterns ===');

    // Create different execution flow patterns
    const sequentialNodes = addExecFlowPattern('sequential_execution', {x: 100, y: 100});
    const conditionalNodes = addExecFlowPattern('conditional_flow', {x: 100, y: 300});
    const loopNodes = addExecFlowPattern('loop_patterns', {x: 100, y: 500});
    const multiRoutingNodes = addExecFlowPattern('multi_routing', {x: 100, y: 700});

    console.log('Created execution flow patterns:');
    console.log('- Sequential execution:', sequentialNodes.length, 'nodes');
    console.log('- Conditional flow:', conditionalNodes.length, 'nodes');
    console.log('- Loop patterns:', loopNodes.length, 'nodes');
    console.log('- Multi routing:', multiRoutingNodes.length, 'nodes');

    return {
        sequential: sequentialNodes,
        conditional: conditionalNodes,
        loops: loopNodes,
        multiRouting: multiRoutingNodes
    };
}

// Export all examples for easy use
export const EXEC_FLOW_EXAMPLES = {
    sequential: createSequentialExecutionExample,
    conditional: createConditionalFlowExample,
    multiRouting: createMultiRoutingExample,
    loops: createLoopControlExample,
    gameEvent: createGameEventSystemExample,
    patterns: createExecFlowPatternsExample
};

// Run examples if this file is executed directly
console.log('\n=== Execution Flow Control Examples ===');
Object.entries(EXEC_FLOW_EXAMPLES).forEach(([name, exampleFn]) => {
    console.log(`\nRunning ${name} example:`);
    try {
        exampleFn();
    } catch (error) {
        console.log(`Example ${name} requires runtime environment:`, error.message);
    }
});

export default EXEC_FLOW_EXAMPLES;
