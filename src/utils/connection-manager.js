import { ref } from 'vue';
import {nodes, ioPositions, nextId, log} from './state.js';

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
  const fromOut = fromNode.outputs?.find(o => (o.name || o) === from.output);
  const toIn = toNode.inputs?.find(i => (i.name || i) === to.input);
  const fromType = fromOut?.type;
  const toType = toIn?.type;
  if (!fromType || !toType) return;

  const isExec = (t) => String(t || '').toLowerCase() === 'exec';
  // Allow exec-to-exec regardless of names (Then 0, True, etc.)
  if (isExec(fromType) && isExec(toType)) {
    connections.value.push({ from, to });
    return;
  }
  // Disallow mixing exec with data
  if (isExec(fromType) !== isExec(toType)) {
    log('Incompatible types (exec/data mismatch)', { fromType, toType, from, to });
    return;
  }
  // For data, types must match (casting handled elsewhere)
  if (fromType !== toType) {
    log('Incompatible data types', { fromType, toType, from, to });
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

