import { nodes, nextId, log } from './state.js';

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
  }
}

export function deleteNode(nodeId) {
  const nodeIndex = nodes.value.findIndex(n => n.id === nodeId);
  if (nodeIndex !== -1) {
    nodes.value.splice(nodeIndex, 1);
    log('Deleted node:', nodeId);
    return true;
  }
  return false;
}
