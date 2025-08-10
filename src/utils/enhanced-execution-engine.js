/**
 * Enhanced Graph Execution Engine
 * Better separation of concerns and error handling
 */

import { ref, computed } from 'vue';

export class ExecutionContext {
  constructor() {
    this.variables = new Map();
    this.callStack = [];
    this.executionTime = 0;
    this.stepCount = 0;
  }
  
  setVariable(name, value, type) {
    this.variables.set(name, { value, type, updatedAt: Date.now() });
  }
  
  getVariable(name) {
    return this.variables.get(name)?.value;
  }
  
  pushCall(nodeId, functionName) {
    this.callStack.push({ nodeId, functionName, timestamp: Date.now() });
  }
  
  popCall() {
    return this.callStack.pop();
  }
}

// Execution strategies for different node types
const executionStrategies = new Map();

/**
 * Register execution strategy for a node type
 */
export function registerExecutionStrategy(nodeType, strategy) {
  executionStrategies.set(nodeType, strategy);
}

/**
 * Execute a single node with proper context
 */
export async function executeNode(node, context, inputs = {}) {
  const strategy = executionStrategies.get(node.type);
  
  if (!strategy) {
    throw new Error(`No execution strategy for node type: ${node.type}`);
  }
  
  context.pushCall(node.id, node.funcName || node.systemName || node.type);
  context.stepCount++;
  
  try {
    const result = await strategy(node, context, inputs);
    context.popCall();
    return result;
  } catch (error) {
    context.popCall();
    throw new ExecutionError(`Error executing node ${node.id}`, {
      nodeId: node.id,
      nodeType: node.type,
      originalError: error,
      context: {
        callStack: [...context.callStack],
        stepCount: context.stepCount
      }
    });
  }
}

/**
 * Custom error class for execution errors
 */
export class ExecutionError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ExecutionError';
    this.details = details;
  }
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
    return { value: context.getVariable(node.varName) };
  } else if (node.varAction === 'set') {
    context.setVariable(node.varName, inputs.value, node.varType);
    return {};
  }
});

registerExecutionStrategy('system', async (node, context, inputs) => {
  const outputs = {};
  
  switch (node.systemName) {
    case 'print':
      console.log('Print:', inputs.message || inputs.value || '');
      break;
    case 'delay':
      await new Promise(resolve => 
        setTimeout(resolve, (inputs.duration || 1) * 1000)
      );
      break;
    default:
      console.log(`Executing system: ${node.systemName}`, inputs);
  }
  
  return outputs;
});

/**
 * Performance monitoring
 */
export const executionMetrics = ref({
  totalExecutions: 0,
  averageExecutionTime: 0,
  errorCount: 0,
  lastExecution: null
});

/**
 * Update execution metrics
 */
export function updateMetrics(executionTime, hasError = false) {
  const metrics = executionMetrics.value;
  
  metrics.totalExecutions++;
  metrics.averageExecutionTime = 
    (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + executionTime) / 
    metrics.totalExecutions;
  
  if (hasError) {
    metrics.errorCount++;
  }
  
  metrics.lastExecution = Date.now();
}
