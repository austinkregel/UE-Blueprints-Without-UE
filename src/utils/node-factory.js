import { getNodeDefinition, getCategoryColor, getAllNodeDefinitions } from './language-definition.js';
import { getNextNodeId } from './id-utils.js';

/**
 * Create a new node based on a language definition
 * @param {string} nodeDefId - The ID of the node definition to create
 * @param {number} x - X position for the node
 * @param {number} y - Y position for the node
 * @param {Object} overrides - Optional property overrides
 * @returns {Object|null} - The created node or null if definition not found
 */
export function createNodeFromDefinition(nodeDefId, x = 100, y = 100, overrides = {}) {
  const definition = getNodeDefinition(nodeDefId);
  
  if (!definition) {
    return null;
  }

  const node = {
    id: getNextNodeId(nodeDefId),
    type: definition.category ? definition.category.toLowerCase() : 'function',
    nodeDefId,
    name: definition.name,
    x,
    y,
    inputs: definition.inputs ? JSON.parse(JSON.stringify(definition.inputs)) : [],
    outputs: definition.outputs ? JSON.parse(JSON.stringify(definition.outputs)) : [],
    description: definition.description,
    category: definition.category,
    ...overrides
  };
  
  return node;
}

/**
 * Create a variable node (get or set)
 * @param {string} varName - Variable name
 * @param {string} varType - Variable type
 * @param {string} action - 'get' or 'set'
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} overrides - Optional property overrides (e.g., refs)
 * @returns {Object} - The created variable node
 */
export function createVariableNode(varName, varType, action = 'get', x = 100, y = 100, overrides = {}) {
  const nodeId = getNextNodeId('variable');
  
  const node = {
    id: nodeId,
    type: 'variable',
    varName,
    varType,
    varAction: action,
    x,
    y,
    inputs: action === 'set' ? [{ name: 'value', type: varType }] : [],
    outputs: action === 'get' ? [{ name: 'value', type: varType }] : [],
    category: 'VARIABLE',
    ...overrides
  };

  return node;
}

/**
 * Create a custom function node
 * @param {string} funcName - Function name
 * @param {Array} inputs - Input parameters
 * @param {Array} outputs - Output parameters
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} overrides - Optional property overrides (e.g., refs)
 * @returns {Object} - The created function node
 */
export function createFunctionNode(funcName, inputs = [], outputs = [], x = 100, y = 100, overrides = {}) {
  const nodeId = getNextNodeId('function');
  
  const node = {
    id: nodeId,
    type: 'function',
    funcName,
    x,
    y,
    inputs: JSON.parse(JSON.stringify(inputs)),
    outputs: JSON.parse(JSON.stringify(outputs)),
    category: 'FUNCTION',
    ...overrides
  };

  return node;
}

/**
 * Create a constant (literal) node
 */
export function createLiteralNode(kind = 'string', value, x = 100, y = 100) {
  const nodeId = getNextNodeId('variable');
  const printable = kind === 'string' ? JSON.stringify(value ?? '')
    : kind === 'bool' ? String(!!value)
    : String(value);
  return {
    id: nodeId,
    type: 'variable', // render as compact, no header
    varName: printable, // show the literal value in the label
    varType: kind,
    varAction: 'get',
    x,
    y,
    inputs: [],
    outputs: [{ name: printable, type: kind }], // keep IO map consistent with variable rendering
    category: 'CONSTANT',
    isLiteral: true,
    value
  };
}

/**
 * Get all available node definitions organized by category
 * @returns {Object} - Node definitions grouped by category
 */
export function getNodePalette() {
  const allNodes = getAllNodeDefinitions();
  const palette = {};

  for (const [nodeId, nodeDef] of Object.entries(allNodes)) {
    const category = nodeDef.category;
    if (!palette[category]) {
      palette[category] = {
        name: category,
        color: getCategoryColor(category),
        nodes: []
      };
    }
    
    palette[category].nodes.push({
      id: nodeId,
      name: nodeDef.name,
      description: nodeDef.description,
      inputs: nodeDef.inputs,
      outputs: nodeDef.outputs
    });
  }

  return palette;
}

/**
 * Create a cast node for type conversion
 * @param {string} fromType - Source type
 * @param {string} toType - Target type
 * @param {number} x - X position
 * @param {number} y - Y position
 * @returns {Object} - The created cast node
 */
export function createCastNode(fromType, toType, x = 100, y = 100) {
  const nodeId = getNextNodeId('cast');
  
  const node = {
    id: nodeId,
    type: 'cast',
    fromType,
    toType,
    x,
    y,
    inputs: [{ name: 'in', type: fromType }],
    outputs: [{ name: 'out', type: toType }],
    category: 'CAST'
  };

  return node;
}

/**
 * Validate a node structure against its definition
 * @param {Object} node - The node to validate
 * @returns {Object} - Validation result with isValid and errors
 */
export function validateNode(node) {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check if node has required properties
  const requiredProps = ['id', 'type', 'x', 'y'];
  for (const prop of requiredProps) {
    if (node[prop] === undefined) {
      result.errors.push(`Missing required property: ${prop}`);
      result.isValid = false;
    }
  }

  // If node has a definition ID, validate against it
  if (node.nodeDefId) {
    const nodeDef = getNodeDefinition(node.nodeDefId);
    if (!nodeDef) {
      result.errors.push(`Node definition not found: ${node.nodeDefId}`);
      result.isValid = false;
    } else {
      // Validate inputs and outputs match definition
      if (nodeDef.inputs && JSON.stringify(node.inputs) !== JSON.stringify(nodeDef.inputs)) {
        result.warnings.push('Node inputs differ from definition');
      }
      
      if (nodeDef.outputs && JSON.stringify(node.outputs) !== JSON.stringify(nodeDef.outputs)) {
        result.warnings.push('Node outputs differ from definition');
      }
    }
  }

  return result;
}
