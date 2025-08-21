import {draggingConnection, ioPositions} from './state.js';
import {screenToWorld} from './viewport-utils.js';
import {connectNodes} from './connection-utils.js';
import {pendingConnectionRequest} from './pending-connection.js';

export function startConnectionDrag({nodeId, ioType, ioName, x, y}) {
    draggingConnection.value = {
        from: ioType === 'output' ? {nodeId, output: ioName} : null,
        to: ioType === 'input' ? {nodeId, input: ioName} : null,
        type: ioType,
        start: {x, y},
        mouse: {x, y}
    };
    window.addEventListener('mousemove', onConnectionDragMove);
    window.addEventListener('mouseup', onConnectionDragEnd);
}

export function onConnectionDragMove(e) {
    if (draggingConnection.value) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        draggingConnection.value.mouse = worldPos;
        draggingConnection.value.dragPos = worldPos;
    }
}

export function onConnectionDragEnd(e) {
    window.removeEventListener('mousemove', onConnectionDragMove);
    window.removeEventListener('mouseup', onConnectionDragEnd);

    if (!draggingConnection.value) return;

    const worldPos = screenToWorld(e.clientX, e.clientY);
    let nearestIO = null;
    let nearestDist = 24;
    // Helper to preserve string IDs when not purely numeric
    const parseNodeId = (id) => {
        const s = String(id);
        return /^\d+$/.test(s) ? Number(s) : s;
    };
    for (const nodeId in ioPositions.value) {
        for (const side of ['inputs', 'outputs']) {
            const ios = ioPositions.value[nodeId][side] || {};
            for (const ioName in ios) {
                const pos = ios[ioName];
                const dx = worldPos.x - pos.x;
                const dy = worldPos.y - pos.y;
                const dist = Math.hypot(dx, dy);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestIO = {nodeId: parseNodeId(nodeId), side, ioName};
                }
            }
        }
    }

    if (nearestIO) {
        const drag = draggingConnection.value;
        if ((drag.type === 'output' || drag.type === 'exec') && nearestIO.side === 'inputs') {
            connectNodes({
                from: {nodeId: drag.from.nodeId, output: drag.from.output},
                to: {nodeId: nearestIO.nodeId, input: nearestIO.ioName}
            });
            draggingConnection.value = null;
            return;
        } else if (drag.type === 'input' && nearestIO.side === 'outputs') {
            connectNodes({
                from: {nodeId: nearestIO.nodeId, output: nearestIO.ioName},
                to: {nodeId: drag.to.nodeId, input: drag.to.input}
            });
            draggingConnection.value = null;
            return;
        }
    }

    // Not connected to any IO: open node creation context via pending request
    const drag = draggingConnection.value;
    pendingConnectionRequest.value = {drag, position: worldPos};
    draggingConnection.value = null;
}
