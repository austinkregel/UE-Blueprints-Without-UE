import { nodes } from './base-node-utils.js';
import { getNextNodeId } from './id-utils.js';
import { 
  getSystemNodes, 
  getEventNodes, 
  searchNodeLibrary 
} from './node-library.js';
import { createNodeFromDefinition } from './node-factory.js';

/**
 * Add a system node by definition ID
 */
export function addSystemNode(nodeDefId = 'print', position = { x: 500, y: 300 }) {
  const newNode = createNodeFromDefinition(nodeDefId, position.x, position.y, {
    id: getNextNodeId('system'),
    type: 'system',
    systemName: nodeDefId
  });
  
  nodes.value.push(newNode);
  return newNode;
}

/**
 * Add an event node
 */
export function addEventNode(nodeDefId = 'on_start', position = { x: 100, y: 100 }) {
  const newNode = createNodeFromDefinition(nodeDefId, position.x, position.y, {
    id: getNextNodeId('event'),
    type: 'event'
  });
  
  nodes.value.push(newNode);
  return newNode;
}

/**
 * Get all available system node types
 */
export function getAvailableSystemNodes() {
  return getSystemNodes();
}

/**
 * Get all available event node types
 */
export function getAvailableEventNodes() {
  return getEventNodes();
}

/**
 * Search for nodes by name or functionality
 */
export function searchAvailableNodes(searchTerm) {
  return searchNodeLibrary(searchTerm);
}

/**
 * Add a common system node by name
 */
export function addCommonSystemNode(nodeName, position = { x: 500, y: 300 }) {
  const commonNodes = {
    'print': 'print',
    'delay': 'delay',
    'random': 'random',
    'timer': 'on_timer',
    'file_read': 'read_file',
    'file_write': 'write_file',
    'http_get': 'http_get',
    'spawn': 'spawn_actor',
    'sequence': 'sequence',
    'gate': 'gate'
  };
  
  const nodeDefId = commonNodes[nodeName];
  if (nodeDefId) {
    return addSystemNode(nodeDefId, position);
  } else {
    console.warn(`Unknown system node: ${nodeName}`);
    return null;
  }
}

/**
 * Add multiple related nodes (e.g., for a complete workflow)
 */
export function addNodeGroup(groupType, startPosition = { x: 100, y: 100 }) {
  const spacing = { x: 250, y: 150 };
  const addedNodes = [];
  
  switch (groupType) {
    case 'basic_game_setup':
      addedNodes.push(addEventNode('on_start', startPosition));
      addedNodes.push(addSystemNode('spawn_actor', { 
        x: startPosition.x + spacing.x, 
        y: startPosition.y 
      }));
      addedNodes.push(addSystemNode('play_sound', { 
        x: startPosition.x + spacing.x * 2, 
        y: startPosition.y 
      }));
      break;
      
    case 'math_operations':
      addedNodes.push(addSystemNode('add', startPosition));
      addedNodes.push(addSystemNode('multiply', { 
        x: startPosition.x + spacing.x, 
        y: startPosition.y 
      }));
      addedNodes.push(addSystemNode('equals', { 
        x: startPosition.x + spacing.x * 2, 
        y: startPosition.y 
      }));
      break;
      
    case 'file_operations':
      addedNodes.push(addSystemNode('file_exists', startPosition));
      addedNodes.push(addSystemNode('read_file', { 
        x: startPosition.x, 
        y: startPosition.y + spacing.y 
      }));
      addedNodes.push(addSystemNode('write_file', { 
        x: startPosition.x + spacing.x, 
        y: startPosition.y + spacing.y 
      }));
      break;
      
    case 'vector_math':
      addedNodes.push(addSystemNode('make_vector', startPosition));
      addedNodes.push(addSystemNode('vector_length', { 
        x: startPosition.x + spacing.x, 
        y: startPosition.y 
      }));
      addedNodes.push(addSystemNode('normalize_vector', { 
        x: startPosition.x + spacing.x * 2, 
        y: startPosition.y 
      }));
      break;
      
    default:
      console.warn(`Unknown node group: ${groupType}`);
  }
  
  return addedNodes;
}
