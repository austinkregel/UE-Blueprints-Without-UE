import {nodes, draggingConnection, log, ioPositions} from './base-node-utils.js';
import { connectNodes } from './connection-utils.js';
import { startPanning, updatePanning, stopPanning, isPanning, screenToWorld } from './viewport-utils.js';

export function onEditorMouseDown(e) {
    // Check if we're right-clicking on empty space (not on a node)
    const target = e.target;
    const nodeElement = target.closest('[data-node-id]');
    
    // Handle right-click panning if not on a node and not currently dragging a connection
    if (e.button === 2 && !nodeElement && !draggingConnection.value) {
        e.preventDefault();
        startPanning(e.clientX, e.clientY);
        
        // Add event listeners for panning
        const handlePanMove = (moveEvent) => {
            updatePanning(moveEvent.clientX, moveEvent.clientY);
        };
        
        const handlePanEnd = () => {
            stopPanning();
            document.removeEventListener('mousemove', handlePanMove);
            document.removeEventListener('mouseup', handlePanEnd);
        };
        
        document.addEventListener('mousemove', handlePanMove);
        document.addEventListener('mouseup', handlePanEnd);
        
        return;
    }
    
    // Only handle connection logic for left clicks or when already dragging
    if (e.button !== 0 && !draggingConnection.value) return;
    
    // Do NOT clear draggingConnection on mouse down (so it stays attached to the mouse)
    // Find the closest IO point under the cursor, convert screen to world coordinates first
    const worldPos = screenToWorld(e.clientX, e.clientY);
    
    let closestIO = null;
    let minDist = 32; // threshold in pixels (in world space)
    for (const nodeId in ioPositions.value) {
        for (const type of ['inputs', 'outputs']) {
            for (const ioName in ioPositions.value[nodeId][type]) {
                const pos = ioPositions.value[nodeId][type][ioName];
                const dx = worldPos.x - pos.x;
                const dy = worldPos.y - pos.y;
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
