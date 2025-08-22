import { draggingConnection, ioPositions, log } from './state.js';
import { connectNodes } from './connection-utils.js';
import { screenToWorld, startPanning, stopPanning, suppressNextContextMenu, updatePanning } from './viewport-utils.js';

let rightMouseDown = false;
let movedWhileRightDown = false;

export function onEditorMouseDown(e, emit) {
    // Track right button state for drag detection
    if (e.button === 2) {
        rightMouseDown = true;
        movedWhileRightDown = false;
    }

    // Check if we're right-clicking on empty space (not on a node)
    const target = e.target;
    const nodeElement = target.closest('[data-node-id]');

    // Deselect node if left-click on empty space
    if (e.button === 0 && !nodeElement && typeof emit === 'function') {
        emit('deselect');
    }

    // Handle right-click panning if not on a node and not currently dragging a connection
    if (e.button === 2 && !nodeElement && !draggingConnection.value) {
        e.preventDefault();
        startPanning(e.clientX, e.clientY);

        // Add event listeners for panning
        const handlePanMove = (moveEvent) => {
            updatePanning(moveEvent.clientX, moveEvent.clientY);
            // Mark as moved and set suppression immediately
            movedWhileRightDown = true;
            suppressNextContextMenu.value = true;
        };

        const handlePanEnd = () => {
            stopPanning();
            rightMouseDown = false;
            movedWhileRightDown = false;
            document.removeEventListener('mousemove', handlePanMove);
            document.removeEventListener('mouseup', handlePanEnd);
        };

        document.addEventListener('mousemove', handlePanMove);
        document.addEventListener('mouseup', handlePanEnd);

        return;
    }

    // If it's a right click on a node (or any non-panning case), suppress menu if a drag occurs
    if (e.button === 2) {
        const handleGenericMove = () => {
            movedWhileRightDown = true;
            suppressNextContextMenu.value = true;
        };
        const handleGenericUp = () => {
            rightMouseDown = false;
            movedWhileRightDown = false;
            document.removeEventListener('mousemove', handleGenericMove);
            document.removeEventListener('mouseup', handleGenericUp);
        };
        document.addEventListener('mousemove', handleGenericMove);
        document.addEventListener('mouseup', handleGenericUp);
    }

    // Only handle connection logic for left clicks or when already dragging
    if (e.button !== 0 && !draggingConnection.value) return;

    // Do NOT clear draggingConnection on mouse down (so it stays attached to the mouse)
    // Find the closest IO point under the cursor, convert screen to world coordinates first
    const worldPos = screenToWorld(e.clientX, e.clientY);

    let closestIO = null;
    let minDist = 32; // threshold in pixels (in world space)
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
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    closestIO = { nodeId: parseNodeId(nodeId), side, ioName, pos };
                }
            }
        }
    }
    if (closestIO && draggingConnection.value) {
        const drag = draggingConnection.value;
        const dragType = drag.type || drag.ioType; // support legacy test shape
        // Only allow connections to inputs when dragging from output
        if (dragType === 'output' && closestIO.side === 'inputs' && drag.from) {
            connectNodes({
                from: { nodeId: drag.from.nodeId, output: drag.from.output },
                to: { nodeId: closestIO.nodeId, input: closestIO.ioName }
            });
            draggingConnection.value = null;
            // Only allow connections to outputs when dragging from input
        } else if (dragType === 'input' && closestIO.side === 'outputs' && drag.to) {
            connectNodes({
                from: { nodeId: closestIO.nodeId, output: closestIO.ioName },
                to: { nodeId: drag.to.nodeId, input: drag.to.input }
            });
            draggingConnection.value = null;
        } else {
            log('Invalid connection target for current drag state');
        }
    }
}

// Prevent context menu if a pan gesture just occurred
if (typeof window !== 'undefined') {
    window.addEventListener(
        'contextmenu',
        (e) => {
            if (suppressNextContextMenu.value) {
                e.stopPropagation();
                e.preventDefault();
                suppressNextContextMenu.value = false;
            }
        },
        { capture: true }
    );
}
