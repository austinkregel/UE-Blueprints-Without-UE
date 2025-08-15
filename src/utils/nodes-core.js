import { nodes, nextId, log } from './state.js';
import { pruneDanglingConnections } from './connection-manager.js';

export function addNode(position = { x: 200, y: 200 }) {
  const node = {
    id: nextId.value++,
    type: 'function',
    funcName: 'CustomFunction',
    x: position.x,
    y: position.y,
    inputs: [],
    outputs: [],
  };
  nodes.value.push(node);
  return node;
}

export function moveNode({ id, x, y }) {
  const node = nodes.value.find(n => n.id === id);
  if (node) {
    node.x = x;
    node.y = y;
  }
}

export function updateNodeIO({ id, inputs, outputs }) {
  const node = nodes.value.find(n => n.id === id);
  if (node) {
    node.inputs = Array.isArray(inputs) ? [...inputs] : [];
    node.outputs = Array.isArray(outputs) ? [...outputs] : [];
    // Drop connections that no longer match node pins
    pruneDanglingConnections();
  }
}

export function updateNode(props) {
  const node = nodes.value.find(n => n.id === props?.id);
  if (!node) return;
  const allowed = ['name', 'x', 'y', 'funcName', 'varName', 'varType', 'varAction', 'value'];
  for (const key of allowed) {
    if (props[key] !== undefined) node[key] = props[key];
  }
}

export function deleteNode(nodeId) {
  const nodeIndex = nodes.value.findIndex(n => n.id === nodeId);
  if (nodeIndex !== -1) {
    nodes.value.splice(nodeIndex, 1);
    log('Deleted node:', nodeId);
    pruneDanglingConnections();
    return true;
  }
  return false;
}
