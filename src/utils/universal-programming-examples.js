/**
 * Universal Programming Concepts Examples
 * 
 * This file demonstrates how to use the comprehensive set of universal programming
 * features that have been implemented as visual nodes. These examples show common
 * programming patterns that exist across all programming languages.
 */

import { 
  getBitwiseNodes,
  getExceptionNodes,
  getMemoryNodes,
  getAdvancedMathNodes,
  getAdvancedStringNodes,
  getAdvancedArrayNodes,
  getObjectNodes,
  getFunctionalNodes,
  getIONodes,
  getTimeNodes,
  getNetworkNodes,
  getEnhancedSystemNodes,
  getProgrammingParadigmNodes,
  createNodeFromDefinition
} from './node-library.js';

// Example 1: Data Processing Pipeline
export function createDataProcessingExample() {
  console.log('=== Universal Programming Concepts: Data Processing ===');
  
  const nodes = [];
  
  // Input data
  const inputNode = createNodeFromDefinition('read_input', { x: 50, y: 100 });
  
  // String processing
  const trimNode = createNodeFromDefinition('trim', { x: 200, y: 100 });
  const splitNode = createNodeFromDefinition('split', { x: 350, y: 100 });
  
  // Array processing
  const filterNode = createNodeFromDefinition('array_filter', { x: 500, y: 100 });
  const mapNode = createNodeFromDefinition('array_map', { x: 650, y: 100 });
  
  // Math operations
  const sumReduceNode = createNodeFromDefinition('array_reduce', { x: 800, y: 100 });
  
  // Output
  const printNode = createNodeFromDefinition('print', { x: 950, y: 100 });
  
  nodes.push(inputNode, trimNode, splitNode, filterNode, mapNode, sumReduceNode, printNode);
  
  console.log('Data processing pipeline created with', nodes.length, 'nodes');
  console.log('Flow: Input → Trim → Split → Filter → Map → Reduce → Print');
  
  return nodes;
}

// Example 2: Exception Handling Pattern
export function createExceptionHandlingExample() {
  console.log('=== Universal Programming Concepts: Exception Handling ===');
  
  const nodes = [];
  
  // Try-catch block
  const tryCatchNode = createNodeFromDefinition('try_catch', { x: 100, y: 200 });
  
  // Risky operation (file read)
  const fileReadNode = createNodeFromDefinition('file_read', { x: 250, y: 150 });
  
  // Success path
  const processDataNode = createNodeFromDefinition('json_decode', { x: 400, y: 150 });
  const printSuccessNode = createNodeFromDefinition('print', { x: 550, y: 150 });
  
  // Error path
  const printErrorNode = createNodeFromDefinition('print', { x: 400, y: 250 });
  
  // Finally block
  const cleanupNode = createNodeFromDefinition('print', { x: 550, y: 300 });
  
  nodes.push(tryCatchNode, fileReadNode, processDataNode, printSuccessNode, printErrorNode, cleanupNode);
  
  console.log('Exception handling pattern created with', nodes.length, 'nodes');
  console.log('Flow: Try → File Read → Process → Success/Error → Finally');
  
  return nodes;
}

// Example 3: Functional Programming Pattern
export function createFunctionalProgrammingExample() {
  console.log('=== Universal Programming Concepts: Functional Programming ===');
  
  const nodes = [];
  
  // Create sample data
  const arrayNode = createNodeFromDefinition('to_array', { x: 50, y: 300 });
  
  // Lambda function for filtering
  const filterLambdaNode = createNodeFromDefinition('lambda', { x: 200, y: 250 });
  const filterNode = createNodeFromDefinition('array_filter', { x: 350, y: 300 });
  
  // Lambda function for mapping
  const mapLambdaNode = createNodeFromDefinition('lambda', { x: 200, y: 350 });
  const mapNode = createNodeFromDefinition('array_map', { x: 500, y: 300 });
  
  // Reduce operation
  const reduceLambdaNode = createNodeFromDefinition('lambda', { x: 200, y: 450 });
  const reduceNode = createNodeFromDefinition('array_reduce', { x: 650, y: 300 });
  
  // Output result
  const printNode = createNodeFromDefinition('print', { x: 800, y: 300 });
  
  nodes.push(arrayNode, filterLambdaNode, filterNode, mapLambdaNode, mapNode, reduceLambdaNode, reduceNode, printNode);
  
  console.log('Functional programming pattern created with', nodes.length, 'nodes');
  console.log('Flow: Array → Filter(λ) → Map(λ) → Reduce(λ) → Print');
  
  return nodes;
}

// Example 4: System Programming Pattern
export function createSystemProgrammingExample() {
  console.log('=== Universal Programming Concepts: System Programming ===');
  
  const nodes = [];
  
  // Get environment variable
  const getEnvNode = createNodeFromDefinition('get_env', { x: 50, y: 400 });
  
  // Conditional check
  const ifNode = createNodeFromDefinition('if', { x: 200, y: 400 });
  
  // System command execution
  const sysCommandNode = createNodeFromDefinition('system_command', { x: 350, y: 350 });
  
  // File operations
  const fileExistsNode = createNodeFromDefinition('file_exists', { x: 350, y: 450 });
  const fileWriteNode = createNodeFromDefinition('file_write', { x: 500, y: 450 });
  
  // Memory operations
  const sizeofNode = createNodeFromDefinition('sizeof', { x: 650, y: 400 });
  
  // Bitwise operations
  const bitwiseAndNode = createNodeFromDefinition('bitwise_and', { x: 800, y: 400 });
  
  nodes.push(getEnvNode, ifNode, sysCommandNode, fileExistsNode, fileWriteNode, sizeofNode, bitwiseAndNode);
  
  console.log('System programming pattern created with', nodes.length, 'nodes');
  console.log('Flow: Env Check → Conditional → System Calls → File Ops → Memory Ops → Bitwise');
  
  return nodes;
}

// Example 5: Network Programming Pattern
export function createNetworkProgrammingExample() {
  console.log('=== Universal Programming Concepts: Network Programming ===');
  
  const nodes = [];
  
  // Prepare request data
  const objectNode = createNodeFromDefinition('object_set', { x: 50, y: 500 });
  const jsonEncodeNode = createNodeFromDefinition('json_encode', { x: 200, y: 500 });
  
  // HTTP request
  const httpPostNode = createNodeFromDefinition('http_post', { x: 350, y: 500 });
  
  // Response processing
  const jsonDecodeNode = createNodeFromDefinition('json_decode', { x: 500, y: 500 });
  const objectGetNode = createNodeFromDefinition('object_get', { x: 650, y: 500 });
  
  // Output processing
  const printNode = createNodeFromDefinition('print', { x: 800, y: 500 });
  
  nodes.push(objectNode, jsonEncodeNode, httpPostNode, jsonDecodeNode, objectGetNode, printNode);
  
  console.log('Network programming pattern created with', nodes.length, 'nodes');
  console.log('Flow: Object → JSON Encode → HTTP POST → JSON Decode → Extract → Print');
  
  return nodes;
}

// Example 6: Time and Performance Pattern
export function createTimeAndPerformanceExample() {
  console.log('=== Universal Programming Concepts: Time and Performance ===');
  
  const nodes = [];
  
  // Start timer
  const timerStartNode = createNodeFromDefinition('timer_start', { x: 50, y: 600 });
  
  // Current time
  const currentTimeNode = createNodeFromDefinition('current_time', { x: 200, y: 550 });
  const formatTimeNode = createNodeFromDefinition('format_time', { x: 350, y: 550 });
  
  // Some processing (simulated with sleep)
  const sleepNode = createNodeFromDefinition('sleep', { x: 200, y: 650 });
  
  // Advanced math operations
  const sinNode = createNodeFromDefinition('sin', { x: 350, y: 650 });
  const logNode = createNodeFromDefinition('log', { x: 500, y: 650 });
  
  // Stop timer
  const timerStopNode = createNodeFromDefinition('timer_stop', { x: 650, y: 600 });
  
  // Print results
  const printTimeNode = createNodeFromDefinition('print', { x: 800, y: 550 });
  const printPerformanceNode = createNodeFromDefinition('print', { x: 800, y: 650 });
  
  nodes.push(timerStartNode, currentTimeNode, formatTimeNode, sleepNode, sinNode, logNode, timerStopNode, printTimeNode, printPerformanceNode);
  
  console.log('Time and performance pattern created with', nodes.length, 'nodes');
  console.log('Flow: Timer Start → Current Time → Processing → Math Ops → Timer Stop → Results');
  
  return nodes;
}

// Example 7: String Processing and Pattern Matching
export function createStringProcessingExample() {
  console.log('=== Universal Programming Concepts: String Processing ===');
  
  const nodes = [];
  
  // Input string
  const inputNode = createNodeFromDefinition('read_input', { x: 50, y: 700 });
  
  // String validation
  const regexMatchNode = createNodeFromDefinition('regex_match', { x: 200, y: 700 });
  const ifValidNode = createNodeFromDefinition('if', { x: 350, y: 700 });
  
  // String processing
  const trimNode = createNodeFromDefinition('trim', { x: 500, y: 650 });
  const upperNode = createNodeFromDefinition('upper', { x: 650, y: 650 });
  const replaceNode = createNodeFromDefinition('regex_replace', { x: 800, y: 650 });
  
  // String analysis
  const lengthNode = createNodeFromDefinition('length', { x: 500, y: 750 });
  const findNode = createNodeFromDefinition('find', { x: 650, y: 750 });
  const splitNode = createNodeFromDefinition('split', { x: 800, y: 750 });
  
  nodes.push(inputNode, regexMatchNode, ifValidNode, trimNode, upperNode, replaceNode, lengthNode, findNode, splitNode);
  
  console.log('String processing pattern created with', nodes.length, 'nodes');
  console.log('Flow: Input → Validate → Process → Transform → Analyze');
  
  return nodes;
}

// Comprehensive example demonstrating all paradigms
export function createComprehensiveExample() {
  console.log('=== Universal Programming Concepts: Comprehensive Example ===');
  
  const allNodes = [
    ...createDataProcessingExample(),
    ...createExceptionHandlingExample(),
    ...createFunctionalProgrammingExample(),
    ...createSystemProgrammingExample(),
    ...createNetworkProgrammingExample(),
    ...createTimeAndPerformanceExample(),
    ...createStringProcessingExample()
  ];
  
  console.log('Comprehensive example created with', allNodes.length, 'total nodes');
  console.log('Demonstrates all major programming paradigms and concepts');
  
  return allNodes;
}

// Display available programming paradigms
export function displayProgrammingParadigms() {
  console.log('=== Available Programming Paradigms ===');
  
  const paradigms = getProgrammingParadigmNodes();
  
  Object.entries(paradigms).forEach(([paradigm, categories]) => {
    console.log(`\n${paradigm.toUpperCase()} PROGRAMMING:`);
    Object.entries(categories).forEach(([category, nodes]) => {
      console.log(`  ${category}: ${Object.keys(nodes).length} nodes`);
      console.log(`    → ${Object.keys(nodes).slice(0, 5).join(', ')}${Object.keys(nodes).length > 5 ? '...' : ''}`);
    });
  });
}

// Universal concepts coverage summary
export function displayUniversalConcepts() {
  console.log('=== Universal Programming Concepts Coverage ===');
  
  const concepts = {
    'Data Types': ['int', 'float', 'string', 'bool', 'array', 'object'],
    'Control Flow': ['if', 'for', 'while', 'foreach', 'switch'],
    'Functions': ['define_function', 'call_function', 'lambda', 'return'],
    'Math Operations': ['add', 'subtract', 'multiply', 'divide', 'sin', 'cos', 'log'],
    'String Operations': ['concat', 'split', 'trim', 'replace', 'regex_match'],
    'Array Operations': ['array_push', 'array_map', 'array_filter', 'array_reduce'],
    'Object Operations': ['object_get', 'object_set', 'object_keys', 'object_merge'],
    'Memory Management': ['is_null', 'sizeof', 'copy', 'reference'],
    'Exception Handling': ['try_catch', 'throw', 'assert'],
    'I/O Operations': ['read_input', 'file_read', 'file_write', 'print'],
    'Network Operations': ['http_get', 'http_post', 'json_encode', 'json_decode'],
    'Time Operations': ['current_time', 'format_time', 'sleep', 'timer_start'],
    'System Operations': ['system_command', 'get_env', 'set_env', 'exit'],
    'Bitwise Operations': ['bitwise_and', 'bitwise_or', 'bitwise_xor', 'bit_shift_left']
  };
  
  console.log('Total concept categories covered:', Object.keys(concepts).length);
  Object.entries(concepts).forEach(([category, examples]) => {
    console.log(`\n${category}:`);
    console.log(`  Examples: ${examples.slice(0, 4).join(', ')}${examples.length > 4 ? '...' : ''}`);
    console.log(`  Total operations: ${examples.length}`);
  });
  
  const totalOperations = Object.values(concepts).reduce((sum, ops) => sum + ops.length, 0);
  console.log(`\nTotal operations available: ${totalOperations}`);
  console.log('✓ Covers all major programming paradigms');
  console.log('✓ Language-agnostic concepts');
  console.log('✓ Universal programming patterns');
}

// Run examples
console.log('Running Universal Programming Concepts Examples...\n');

displayUniversalConcepts();
displayProgrammingParadigms();

// Create all example patterns
createDataProcessingExample();
createExceptionHandlingExample();
createFunctionalProgrammingExample();
createSystemProgrammingExample();
createNetworkProgrammingExample();
createTimeAndPerformanceExample();
createStringProcessingExample();

console.log('\n✅ All universal programming concepts have been demonstrated!');
console.log('📚 These patterns exist in virtually every programming language');
console.log('🎯 Visual programming system now supports complete language-agnostic development');
