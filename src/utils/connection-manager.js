import { ref } from 'vue';
import {nodes, ioPositions, nextId, log} from './base-node-utils.js';

export const connections = ref([]);

function connectionKey(conn) {
  return `${conn.from.nodeId}:${conn.from.output}->${conn.to.nodeId}:${conn.to.input}`;
}

export function getConnections() {
  return connections.value ?? [];
}

export function addConnection({ from, to }) {
  if (!from?.nodeId || !to?.nodeId) {
    log('Invalid connection: missing nodeId', { from, to });
    return;
  }
  // Prevent duplicate connections
  if (connections.value.some(conn => connectionKey(conn) === connectionKey({ from, to }))) {
    log('Connection already exists', { from, to });
    return;
  }
  // Prevent self-connection
  if (from.nodeId === to.nodeId) {
    log('Self-connection not allowed', { from, to });
    return;
  }
  // Validate IO types
  const fromNode = nodes.value.find(n => n.id === from.nodeId);
  const toNode = nodes.value.find(n => n.id === to.nodeId);
  if (!fromNode || !toNode) return;
  const fromType = fromNode.outputs?.find(o => (o.name || o) === from.output)?.type;
  const toType = toNode.inputs?.find(i => (i.name || i) === to.input)?.type;
  if (!fromType || !toType) return;
  // Only allow compatible types (or add cast node logic here)
  if (fromType !== toType) {
    log('Incompatible types', { fromType, toType, from, to });
    return;
  }
  connections.value.push({ from, to });
}

export function removeConnection({ from, to }) {
  const key = connectionKey({ from, to });
  connections.value = connections.value.filter(conn => connectionKey(conn) !== key);
  log('Connection removed', { from, to });
}

export function clearConnections() {
  connections.value = [];
    log('All connections cleared');
}

