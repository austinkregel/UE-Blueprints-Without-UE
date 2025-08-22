import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nodes } from '../state.js';
import { attachPendingConnectionToNode, clearPendingConnectionRequest, pendingConnectionRequest } from '../pending-connection.js';
import { connectNodes } from '../connection-utils.js';

vi.mock('../connection-utils.js', () => {
    return {
        connectNodes: vi.fn()
    };
});

function makeNode(id, inputs = [], outputs = []) {
    return { id, inputs, outputs };
}

describe('pending-connection attachPendingConnectionToNode', () => {
    beforeEach(() => {
        nodes.value = [];
        clearPendingConnectionRequest();
        vi.clearAllMocks();
    });

    it('connects from an output drag to compatible input on new node', () => {
        nodes.value = [makeNode(1, [], [{ name: 'out', type: 'int' }]), makeNode(2, [{ name: 'in', type: 'int' }], [])];
        pendingConnectionRequest.value = {
            drag: { type: 'output', from: { nodeId: 1, output: 'out' } },
            position: { x: 0, y: 0 }
        };

        const ok = attachPendingConnectionToNode(nodes.value[1]);
        expect(ok).toBe(true);
        expect(connectNodes).toHaveBeenCalledWith({ from: { nodeId: 1, output: 'out' }, to: { nodeId: 2, input: 'in' } });
        expect(pendingConnectionRequest.value).toBeNull();
    });

    it('connects from an input drag to compatible output on new node', () => {
        nodes.value = [
            makeNode(1, [{ name: 'in', type: 'string' }], []),
            makeNode(
                3,
                [],
                [
                    {
                        name: 'out',
                        type: 'string'
                    }
                ]
            )
        ];
        pendingConnectionRequest.value = {
            drag: { type: 'input', to: { nodeId: 1, input: 'in' } },
            position: { x: 0, y: 0 }
        };

        const ok = attachPendingConnectionToNode(nodes.value[1]);
        expect(ok).toBe(true);
        expect(connectNodes).toHaveBeenCalledWith({ from: { nodeId: 3, output: 'out' }, to: { nodeId: 1, input: 'in' } });
        expect(pendingConnectionRequest.value).toBeNull();
    });

    it('returns false and does not connect when no compatible IO exists', () => {
        nodes.value = [makeNode(1, [], [{ name: 'out', type: 'int' }]), makeNode(4, [{ name: 'in', type: 'string' }], [])];
        pendingConnectionRequest.value = {
            drag: { type: 'output', from: { nodeId: 1, output: 'out' } },
            position: { x: 0, y: 0 }
        };

        const ok = attachPendingConnectionToNode(nodes.value[1]);
        expect(ok).toBe(false);
        expect(connectNodes).not.toHaveBeenCalled();
        // pending request remains when not connected
        expect(pendingConnectionRequest.value).not.toBeNull();
    });
});
