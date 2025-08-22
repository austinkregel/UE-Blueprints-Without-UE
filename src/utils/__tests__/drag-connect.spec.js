import { beforeEach, describe, expect, it } from 'vitest';
import { draggingConnection, nodes } from '../state.js';
import { onConnectionDragEnd, onConnectionDragMove, startConnectionDrag } from '../drag-connect.js';
import { pendingConnectionRequest } from '../pending-connection.js';

function setupNodes() {
    nodes.value = [{ id: 1, x: 0, y: 0, outputs: [{ name: 'out', type: 'number' }], inputs: [] }];
}

describe('drag-connect', () => {
    beforeEach(() => {
        draggingConnection.value = null;
        pendingConnectionRequest.value = null;
        setupNodes();
    });

    it('starts a connection drag', () => {
        startConnectionDrag({ nodeId: 1, ioType: 'output', ioName: 'out', x: 0, y: 0 });
        expect(draggingConnection.value).toBeTruthy();
        expect(draggingConnection.value.from?.nodeId).toBe(1);
    });

    it('records pending connection when dropped on empty space', () => {
        startConnectionDrag({ nodeId: 1, ioType: 'output', ioName: 'out', x: 0, y: 0 });
        // simulate a mouse event shape with clientX/Y such that screenToWorld returns same values (canvasOffset and viewport are 0 by default in tests)
        onConnectionDragMove({ clientX: 100, clientY: 100 });
        onConnectionDragEnd({ clientX: 200, clientY: 200 });
        expect(pendingConnectionRequest.value).toBeTruthy();
        expect(pendingConnectionRequest.value.position.x).toBe(200);
    });
});
