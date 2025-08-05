import {nodes, draggingConnection, log, ioPositions} from './base-node-utils.js';
import { connectNodes } from './connection-utils.js'

export function onEditorMouseDown(e) {
    // Do NOT clear draggingConnection on mouse down (so it stays attached to the mouse)
    // Find the closest IO point under the cursor
    let closestIO = null;
    let minDist = 32; // threshold in pixels
    for (const nodeId in ioPositions.value) {
        for (const type of ['inputs', 'outputs']) {
            for (const ioName in ioPositions.value[nodeId][type]) {
                const pos = ioPositions.value[nodeId][type][ioName];
                const dx = e.clientX + window.scrollX - pos.x;
                const dy = e.clientY + window.scrollY - pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    closestIO = { nodeId, type, ioName, pos };
                }
            }
        }
    }
    if (closestIO && draggingConnection.value) {
        const drag = draggingConnection.value;
        // Only allow connections to inputs when dragging from output/exec
        if ((drag.ioType === 'output' || drag.ioType === 'exec') && closestIO.type === 'inputs') {
            connectNodes({
                from: { nodeId: drag.nodeId, output: drag.ioName },
                to: { nodeId: closestIO.nodeId, input: closestIO.ioName }
            });
        // Only allow connections to outputs when dragging from input
        } else if (drag.ioType === 'input' && closestIO.type === 'outputs') {
            connectNodes({
                from: { nodeId: closestIO.nodeId, output: closestIO.ioName },
                to: { nodeId: drag.nodeId, input: drag.ioName }
            });
        } else {
            log("Ahhhhhh")
        }
    }
}
