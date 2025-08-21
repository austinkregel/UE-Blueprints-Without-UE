import {ref} from 'vue';

// Global editor state
export const nodes = ref([]);
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
