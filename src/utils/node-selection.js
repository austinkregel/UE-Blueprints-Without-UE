import { selectedNodeId } from './state.js';

export { selectedNodeId };

export function selectNode({ id }) {
    if (id) selectedNodeId.value = id;
}

export function closeSettings() {
    selectedNodeId.value = null;
}
