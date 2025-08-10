import { ref } from 'vue';

// Global editor state
export const nodes = ref([
  // Event Trigger Node
  {
    id: 1,
    type: 'function',
    nodeDefId: 'on_trigger_enter',
    funcName: 'On Trigger Enter',
    x: 100,
    y: 100,
    inputs: [],
    outputs: [
      { name: 'Other Actor', type: 'object' }
    ]
  },
  // Variable Get (boolean example)
  {
    id: 7,
    type: 'variable',
    varName: 'bIsActive',
    varType: 'bool',
    varAction: 'get',
    x: 450,
    y: 200,
    inputs: [],
    outputs: [
      { name: 'bIsActive', type: 'bool' }
    ]
  }
]);
export const nextId = ref(9);
export const ioPositions = ref({}); // { [nodeId]: { inputs: {name: {x,y}}, outputs: {name: {x,y}} } }
export const selectedNodeId = ref(null);
export const draggingConnection = ref(null); // { from: {nodeId, output}, to: {nodeId, input}, type: 'input'|'output', start: {x, y}, mouse: {x, y} }
export const debugMode = ref(true);

export function log(...args) {
  if (debugMode.value) {
    console.log('[DEBUG]', ...args);
  }
}
