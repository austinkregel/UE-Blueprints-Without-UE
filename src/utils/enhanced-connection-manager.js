/**
 * Enhanced Connection Manager
 * Better connection validation and management
 */

import { ref, computed } from 'vue';
import { TYPES } from './language-definition.js';

export const connections = ref([]);

/**
 * Connection validation rules
 */
const connectionRules = {
  // Type compatibility check
  typeCompatible(fromType, toType) {
    if (fromType === toType) return true;
    
    const fromTypeDef = findType(fromType);
    const toTypeDef = findType(toType);
    
    if (!fromTypeDef || !toTypeDef) return false;
    
    return fromTypeDef.compatible?.includes(toType) || false;
  },
  
  // Prevent cycles
  wouldCreateCycle(from, to, existingConnections) {
    // Simple cycle detection - could be enhanced
    const visited = new Set();
    
    function hasPath(startNode, targetNode) {
      if (startNode === targetNode) return true;
      if (visited.has(startNode)) return false;
      
      visited.add(startNode);
      
      const outgoing = existingConnections.filter(conn => 
        conn.from.nodeId === startNode
      );
      
      return outgoing.some(conn => 
        hasPath(conn.to.nodeId, targetNode)
      );
    }
    
    return hasPath(to.nodeId, from.nodeId);
  }
};

function findType(typeName) {
  return Object.values(TYPES).find(category => 
    category[typeName]
  )?.[typeName];
}

/**
 * Enhanced connection creation with validation
 */
export function createConnection(from, to, options = {}) {
  const validation = validateConnection(from, to);
  
  if (!validation.valid) {
    throw new Error(`Invalid connection: ${validation.reason}`);
  }
  
  const connection = {
    id: `${from.nodeId}:${from.output}->${to.nodeId}:${to.input}`,
    from,
    to,
    type: getConnectionType(from, to),
    metadata: options.metadata || {},
    createdAt: Date.now()
  };
  
  connections.value.push(connection);
  return connection;
}

/**
 * Comprehensive connection validation
 */
export function validateConnection(from, to) {
  // Basic validation
  if (!from?.nodeId || !to?.nodeId) {
    return { valid: false, reason: 'Missing node IDs' };
  }
  
  if (from.nodeId === to.nodeId) {
    return { valid: false, reason: 'Self-connection not allowed' };
  }
  
  // Check for existing connection
  const exists = connections.value.some(conn => 
    conn.from.nodeId === from.nodeId &&
    conn.from.output === from.output &&
    conn.to.nodeId === to.nodeId &&
    conn.to.input === to.input
  );
  
  if (exists) {
    return { valid: false, reason: 'Connection already exists' };
  }
  
  // Type compatibility (if types are specified)
  if (from.type && to.type) {
    if (!connectionRules.typeCompatible(from.type, to.type)) {
      return { 
        valid: false, 
        reason: `Incompatible types: ${from.type} -> ${to.type}` 
      };
    }
  }
  
  // Cycle detection
  if (connectionRules.wouldCreateCycle(from, to, connections.value)) {
    return { valid: false, reason: 'Would create cycle' };
  }
  
  return { valid: true };
}

function getConnectionType(from, to) {
  // Determine if this is exec flow or data flow
  const isExecOutput = from.output === 'exec' || from.output === 'Exec';
  const isExecInput = to.input === 'exec' || to.input === 'Exec';
  
  return (isExecOutput && isExecInput) ? 'exec' : 'data';
}

/**
 * Get connections for a specific node
 */
export function getNodeConnections(nodeId) {
  return connections.value.filter(conn => 
    conn.from.nodeId === nodeId || conn.to.nodeId === nodeId
  );
}

/**
 * Remove connection by ID
 */
export function removeConnection(connectionId) {
  const index = connections.value.findIndex(conn => conn.id === connectionId);
  if (index !== -1) {
    connections.value.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Computed properties for connection analysis
 */
export const connectionStats = computed(() => ({
  total: connections.value.length,
  execConnections: connections.value.filter(c => c.type === 'exec').length,
  dataConnections: connections.value.filter(c => c.type === 'data').length,
  nodeConnectivity: getNodeConnectivity()
}));

function getNodeConnectivity() {
  const connectivity = new Map();
  
  connections.value.forEach(conn => {
    const fromId = conn.from.nodeId;
    const toId = conn.to.nodeId;
    
    connectivity.set(fromId, (connectivity.get(fromId) || 0) + 1);
    connectivity.set(toId, (connectivity.get(toId) || 0) + 1);
  });
  
  return connectivity;
}
