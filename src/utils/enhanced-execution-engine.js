/**
 * Enhanced Graph Execution Engine
 * Better separation of concerns and error handling
 */

// Execution strategies for different node types
const executionStrategies = new Map();

/**
 * Register execution strategy for a node type
 */
export function registerExecutionStrategy(nodeType, strategy) {
    executionStrategies.set(nodeType, strategy);
}

// Register default execution strategies
registerExecutionStrategy('function', async (node, context, inputs) => {
    // Default function execution
    const outputs = {};

    // Simple function execution logic
    switch (node.funcName) {
        case 'add':
            outputs.result = (inputs.a || 0) + (inputs.b || 0);
            break;
        case 'multiply':
            outputs.result = (inputs.a || 1) * (inputs.b || 1);
            break;
        default:
            console.log(`Executing function: ${node.funcName}`, inputs);
            outputs.result = inputs.input || null;
    }

    return outputs;
});

registerExecutionStrategy('variable', async (node, context, inputs) => {
    if (node.varAction === 'get') {
        if (node.isLiteral) {
            return {value: node.value};
        }
        return {value: context.getVariable(node.varName)};
    } else if (node.varAction === 'set') {
        context.setVariable(node.varName, inputs.value, node.varType);
        return {};
    }
});

registerExecutionStrategy('system', async (node, context, inputs) => {
    const outputs = {};

    switch (node.systemName) {
        case 'print':
            console.log('Print:', inputs.value ?? inputs.message ?? '');
            break;
        case 'delay':
            await new Promise((resolve) => setTimeout(resolve, (inputs.duration || 1) * 1000));
            break;
        default:
            console.log(`Executing system: ${node.systemName}`, inputs);
    }

    return outputs;
});

// Constants/literals: just output their stored value
registerExecutionStrategy('constant', async (node) => {
    return {value: node.value};
});
