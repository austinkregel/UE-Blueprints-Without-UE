/**
 * Node Editor Composables
 * Vue 3 composables for better state management and reusability
 */

import { ref, computed, watch } from 'vue';
import { createNode, getNode } from './node-manager.js';
import { createConnection, validateConnection } from './enhanced-connection-manager.js';

/**
 * Composable for node management
 */
export function useNodes() {
  const nodes = ref([]);
  const selectedNodeId = ref(null);
  
  const selectedNode = computed(() => {
    return selectedNodeId.value ? 
      nodes.value.find(n => n.id === selectedNodeId.value) : 
      null;
  });
  
  function addNode(type, config = {}) {
    const node = createNode(type, config);
    nodes.value.push(node);
    return node;
  }
  
  function removeNode(nodeId) {
    const index = nodes.value.findIndex(n => n.id === nodeId);
    if (index !== -1) {
      nodes.value.splice(index, 1);
      if (selectedNodeId.value === nodeId) {
        selectedNodeId.value = null;
      }
      return true;
    }
    return false;
  }
  
  function selectNode(nodeId) {
    selectedNodeId.value = nodeId;
  }
  
  function updateNodePosition(nodeId, position) {
    const node = nodes.value.find(n => n.id === nodeId);
    if (node) {
      node.x = position.x;
      node.y = position.y;
    }
  }
  
  return {
    nodes,
    selectedNodeId,
    selectedNode,
    addNode,
    removeNode,
    selectNode,
    updateNodePosition
  };
}

/**
 * Composable for connection management
 */
export function useConnections() {
  const connections = ref([]);
  const draggedConnection = ref(null);
  
  const connectionsByNode = computed(() => {
    const map = new Map();
    connections.value.forEach(conn => {
      const fromId = conn.from.nodeId;
      const toId = conn.to.nodeId;
      
      if (!map.has(fromId)) map.set(fromId, []);
      if (!map.has(toId)) map.set(toId, []);
      
      map.get(fromId).push(conn);
      map.get(toId).push(conn);
    });
    return map;
  });
  
  function startConnection(from) {
    draggedConnection.value = { from, to: null };
  }
  
  function completeConnection(to) {
    if (!draggedConnection.value) return false;
    
    const validation = validateConnection(draggedConnection.value.from, to);
    if (!validation.valid) {
      console.warn('Invalid connection:', validation.reason);
      draggedConnection.value = null;
      return false;
    }
    
    const connection = createConnection(draggedConnection.value.from, to);
    connections.value.push(connection);
    draggedConnection.value = null;
    return true;
  }
  
  function cancelConnection() {
    draggedConnection.value = null;
  }
  
  function removeConnection(connectionId) {
    const index = connections.value.findIndex(c => c.id === connectionId);
    if (index !== -1) {
      connections.value.splice(index, 1);
      return true;
    }
    return false;
  }
  
  return {
    connections,
    draggedConnection,
    connectionsByNode,
    startConnection,
    completeConnection,
    cancelConnection,
    removeConnection
  };
}

/**
 * Composable for viewport management
 */
export function useViewport() {
  const zoom = ref(1);
  const panX = ref(0);
  const panY = ref(0);
  
  const transform = computed(() => 
    `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`
  );
  
  function zoomIn(factor = 1.1) {
    zoom.value = Math.min(zoom.value * factor, 3);
  }
  
  function zoomOut(factor = 0.9) {
    zoom.value = Math.max(zoom.value * factor, 0.1);
  }
  
  function resetZoom() {
    zoom.value = 1;
    panX.value = 0;
    panY.value = 0;
  }
  
  function pan(deltaX, deltaY) {
    panX.value += deltaX;
    panY.value += deltaY;
  }
  
  function screenToWorld(screenX, screenY) {
    return {
      x: (screenX - panX.value) / zoom.value,
      y: (screenY - panY.value) / zoom.value
    };
  }
  
  function worldToScreen(worldX, worldY) {
    return {
      x: worldX * zoom.value + panX.value,
      y: worldY * zoom.value + panY.value
    };
  }
  
  return {
    zoom,
    panX,
    panY,
    transform,
    zoomIn,
    zoomOut,
    resetZoom,
    pan,
    screenToWorld,
    worldToScreen
  };
}

/**
 * Composable for undo/redo functionality
 */
export function useHistory() {
  const history = ref([]);
  const currentIndex = ref(-1);
  const maxHistorySize = 50;
  
  const canUndo = computed(() => currentIndex.value > 0);
  const canRedo = computed(() => currentIndex.value < history.value.length - 1);
  
  function pushState(state, description) {
    // Remove any redo states
    history.value.splice(currentIndex.value + 1);
    
    // Add new state
    history.value.push({
      state: JSON.parse(JSON.stringify(state)),
      description,
      timestamp: Date.now()
    });
    
    // Limit history size
    if (history.value.length > maxHistorySize) {
      history.value.shift();
    } else {
      currentIndex.value++;
    }
  }
  
  function undo() {
    if (canUndo.value) {
      currentIndex.value--;
      return history.value[currentIndex.value].state;
    }
    return null;
  }
  
  function redo() {
    if (canRedo.value) {
      currentIndex.value++;
      return history.value[currentIndex.value].state;
    }
    return null;
  }
  
  return {
    canUndo,
    canRedo,
    pushState,
    undo,
    redo
  };
}
