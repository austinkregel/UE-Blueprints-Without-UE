/**
 * Node System Usage Examples
 * 
 * This file demonstrates how to use the comprehensive node definition system
 * that includes system nodes, engine functions, and all their parameters and types.
 */

import { 
  getNodeLibrary,
  getStarterNodes,
  getGameEngineNodes,
  getSystemUtilityNodes,
  getMathNodes,
  getFlowControlNodes,
  searchNodeLibrary,
  createNodeFromDefinition
} from './node-library.js';

import {
  addSystemNode,
  addCommonSystemNode,
  addNodeGroup,
  getAvailableSystemNodes,
  searchAvailableNodes
} from './system-node-utils.js';

// Example 1: Get the complete node library
console.log('=== Complete Node Library ===');
const library = getNodeLibrary();
console.log('Available categories:', Object.keys(library.categories));
console.log('Total nodes available:', Object.keys(library.nodes).length);

// Example 2: Get specific categories of nodes
console.log('\n=== Starter Nodes ===');
const starterNodes = getStarterNodes();
console.log('Basic math:', Object.keys(starterNodes.basic));
console.log('Flow control:', Object.keys(starterNodes.flow));

// Example 3: Get game engine specific nodes
console.log('\n=== Game Engine Nodes ===');
const gameNodes = getGameEngineNodes();
console.log('Actor nodes:', Object.keys(gameNodes.actors));
console.log('Physics nodes:', Object.keys(gameNodes.physics));
console.log('Vector nodes:', Object.keys(gameNodes.vectors));

// Example 4: Search for specific functionality
console.log('\n=== Search Examples ===');
const vectorNodes = searchNodeLibrary('vector');
console.log('Vector-related nodes:', Object.keys(vectorNodes));

const fileNodes = searchNodeLibrary('file');
console.log('File-related nodes:', Object.keys(fileNodes));

const httpNodes = searchNodeLibrary('http');
console.log('HTTP-related nodes:', Object.keys(httpNodes));

// Example 5: Create specific node instances
console.log('\n=== Node Creation Examples ===');

// Create a basic math node
const addNode = createNodeFromDefinition('add', {
  x: 100,
  y: 100
});
console.log('Add node:', addNode);

// Create a game engine node
const spawnNode = createNodeFromDefinition('spawn_actor', {
  x: 300,
  y: 200
});
console.log('Spawn actor node:', spawnNode);

// Example 6: Node type information
console.log('\n=== Node Type Information ===');
const systemNodes = getAvailableSystemNodes();
Object.entries(systemNodes).forEach(([nodeId, nodeDef]) => {
  console.log(`${nodeId}: ${nodeDef.name} - ${nodeDef.description}`);
  console.log(`  Inputs: ${nodeDef.inputs?.map(i => `${i.name}:${i.type}`).join(', ') || 'none'}`);
  console.log(`  Outputs: ${nodeDef.outputs?.map(o => `${o.name}:${o.type}`).join(', ') || 'none'}`);
});

// Example 7: Complete workflow examples
console.log('\n=== Workflow Examples ===');

// Simple math workflow
function createMathWorkflow() {
  const nodes = [];
  
  // Create input nodes
  const valueA = createNodeFromDefinition('to_float', { x: 100, y: 100 });
  const valueB = createNodeFromDefinition('to_float', { x: 100, y: 200 });
  
  // Create math operation
  const addNode = createNodeFromDefinition('add', { x: 300, y: 150 });
  
  // Create output
  const printNode = createNodeFromDefinition('print', { x: 500, y: 150 });
  
  nodes.push(valueA, valueB, addNode, printNode);
  
  console.log('Math workflow nodes created:', nodes.length);
  return nodes;
}

// File processing workflow
function createFileProcessingWorkflow() {
  const nodes = [];
  
  // File operations
  const fileExists = createNodeFromDefinition('file_exists', { x: 100, y: 100 });
  const readFile = createNodeFromDefinition('read_file', { x: 300, y: 100 });
  const parseJson = createNodeFromDefinition('parse_json', { x: 500, y: 100 });
  const printResult = createNodeFromDefinition('print', { x: 700, y: 100 });
  
  nodes.push(fileExists, readFile, parseJson, printResult);
  
  console.log('File processing workflow nodes created:', nodes.length);
  return nodes;
}

// Run the examples
const mathWorkflow = createMathWorkflow();
const fileWorkflow = createFileProcessingWorkflow();

// Example 8: Export commonly used node sets for easy access
export const COMMON_NODE_SETS = {
  // Essential nodes for beginners
  BEGINNER: [
    'on_start', 'print', 'add', 'subtract', 'equals', 'if', 'sequence'
  ],
  
  // Math and logic nodes
  MATH: [
    'add', 'subtract', 'multiply', 'divide', 'pow', 'sqrt', 'abs',
    'equals', 'greater_than', 'less_than', 'and', 'or', 'not'
  ],
  
  // Game development nodes
  GAME_DEV: [
    'on_start', 'on_update', 'spawn_actor', 'destroy_actor', 
    'get_player', 'set_actor_location', 'play_sound', 'line_trace',
    'make_vector', 'break_vector', 'distance'
  ],
  
  // System and utility nodes
  UTILITIES: [
    'print', 'var_dump', 'delay', 'random', 'timestamp',
    'read_file', 'write_file', 'http_get', 'parse_json'
  ],
  
  // Flow control nodes
  FLOW_CONTROL: [
    'if', 'for', 'while', 'sequence', 'gate', 'do_once', 'multigate'
  ],
  
  // Data manipulation nodes
  DATA: [
    'to_int', 'to_float', 'to_string', 'to_bool',
    'array_push', 'array_pop', 'array_get', 'array_set',
    'concat', 'substring', 'upper', 'lower'
  ]
};

// Helper function to get nodes by set name
export function getNodeSet(setName) {
  const nodeIds = COMMON_NODE_SETS[setName];
  if (!nodeIds) {
    console.warn(`Unknown node set: ${setName}`);
    return {};
  }
  
  const nodes = {};
  nodeIds.forEach(nodeId => {
    try {
      nodes[nodeId] = createNodeFromDefinition(nodeId);
    } catch (error) {
      console.warn(`Could not create node ${nodeId}:`, error.message);
    }
  });
  
  return nodes;
}

console.log('\n=== Node Sets Available ===');
console.log('Available sets:', Object.keys(COMMON_NODE_SETS));

// Example usage of node sets
const beginnerNodes = getNodeSet('BEGINNER');
console.log('Beginner nodes:', Object.keys(beginnerNodes));

const gameDevNodes = getNodeSet('GAME_DEV');
console.log('Game dev nodes:', Object.keys(gameDevNodes));
