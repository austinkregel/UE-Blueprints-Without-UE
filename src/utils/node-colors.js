import { getCategoryColor, getNodeDefinition, NODE_CATEGORIES } from './language-definition.js';

/**
 * Maps node types to their corresponding theme colors
 * @param {string} nodeType - The type of the node (function, variable, system, etc.)
 * @param {string} nodeId - Optional specific node ID for more precise color mapping
 * @returns {string} - The color name for the node type
 */
export function getNodeColor(nodeType, nodeId = null) {
  // First try to get color from node definition if nodeId is provided
  if (nodeId) {
    const nodeDef = getNodeDefinition(nodeId);
    if (nodeDef && nodeDef.category) {
      return getCategoryColor(nodeDef.category);
    }
  }
  
  // Fallback to type-based mapping
  const typeColorMap = {
    'function': 'blue',     
    'variable': 'purple',   
    'system': 'gray',       
    'control': 'yellow',    
    'math': 'green',        
    'string': 'pink',       
    'array': 'orange',      
    'comparison': 'green',  
    'cast': 'cyan',         
    'bitwise': 'purple',    
    'exception': 'red',     
    'memory': 'slate',      
    'advanced_math': 'emerald',
    'advanced_string': 'pink', 
    'advanced_array': 'orange',
    'object': 'violet',   
    'functional': 'red',  
    'io': 'blue',         
    'time': 'amber',      
    'network': 'cyan',    
    'default': 'blue'     
  };

  return typeColorMap[nodeType] || typeColorMap.default;
}

/**
 * Gets all available node colors
 * @returns {Array<string>} - Array of available color names
 */
export function getAvailableColors() {
  return ['blue', 'green', 'yellow', 'purple', 'red', 'cyan', 'pink', 'orange', 'gray'];
}

/**
 * Get color for a specific category
 * @param {string} category - The category name
 * @returns {string} - The color for the category
 */
export function getCategoryColorByName(category) {
  return getCategoryColor(category);
}
