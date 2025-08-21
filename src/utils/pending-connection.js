import {ref} from 'vue';
import {nodes} from './state.js';
import {connectNodes} from './connection-utils.js';
import {isExecIO, isSameType} from './type-utils.js';

export const pendingConnectionRequest = ref(null); // { drag, position }
export function clearPendingConnectionRequest() {
    pendingConnectionRequest.value = null;
}

export function attachPendingConnectionToNode(newNodeOrId) {
    const pending = pendingConnectionRequest.value;
    if (!pending) return false;
    const newNode = typeof newNodeOrId === 'number' ? nodes.value.find((n) => n.id === newNodeOrId) : newNodeOrId;
    if (!newNode) return false;

    const drag = pending.drag;
    const isExec = (x) => isExecIO(x);

    if ((drag.type === 'output' || drag.type === 'exec') && drag.from) {
        const fromNode = nodes.value.find((n) => n.id === drag.from.nodeId);
        const fromOut = fromNode?.outputs?.find((o) => (o.name || o) === drag.from.output);
        const fromType = fromOut?.type;
        const candidate = (newNode.inputs || []).find((input) => {
            if (isExec(input) !== isExec(fromOut)) return false;
            return isSameType(input.type || null, fromType || null);
        });
        if (candidate) {
            connectNodes({from: {...drag.from}, to: {nodeId: newNode.id, input: candidate.name || candidate}});
            clearPendingConnectionRequest();
            return true;
        }
    }
    if (drag.type === 'input' && drag.to) {
        const toNode = nodes.value.find((n) => n.id === drag.to.nodeId);
        const toIn = toNode?.inputs?.find((i) => (i.name || i) === drag.to.input);
        const toType = toIn?.type;
        const candidate = (newNode.outputs || []).find((output) => {
            if (isExec(output) !== isExec(toIn)) return false;
            return isSameType(output.type || null, toType || null);
        });
        if (candidate) {
            connectNodes({from: {nodeId: newNode.id, output: candidate.name || candidate}, to: {...drag.to}});
            clearPendingConnectionRequest();
            return true;
        }
    }
    return false;
}
