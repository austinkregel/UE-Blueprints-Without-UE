import {beforeEach, describe, expect, it} from 'vitest';
import {draggingConnection, nodes} from '../state.js';
import {
    getConnectionColor,
    getDraggingConnectionColor,
    isActionFlow,
    renderDraggingConnection
} from '../connection-visuals.js';
import {getTypeColorHex} from '../language-definition.js';

function makeNode(id, inputs, outputs) {
    return {id, inputs, outputs};
}

describe('connection-visuals', () => {
    beforeEach(() => {
        nodes.value = [];
        draggingConnection.value = null;
    });

    describe('getConnectionColor', () => {
        it('falls back to gray when connection or endpoints are missing', () => {
            expect(getConnectionColor(null)).toBe('#6b7280');
            expect(getConnectionColor({})).toBe('#6b7280');
            nodes.value = [makeNode(1, [], [{name: 'out', type: 'int'}])];
            expect(getConnectionColor({from: {nodeId: 1, output: 'out'}})).toBe('#6b7280');
        });

        it('returns color based on from-output type', () => {
            nodes.value = [makeNode(1, [], [{name: 'out', type: 'int'}]), makeNode(2, [{name: 'in', type: 'int'}], [])];
            const conn = {from: {nodeId: 1, output: 'out'}, to: {nodeId: 2, input: 'in'}};
            expect(getConnectionColor(conn)).toBe(getTypeColorHex('int'));
        });
    });

    describe('getDraggingConnectionColor', () => {
        it('falls back to gray when invalid drag state', () => {
            expect(getDraggingConnectionColor(null)).toBe('#6b7280');
        });

        it('returns color based on from-output type when dragging', () => {
            nodes.value = [makeNode(1, [], [{name: 'out', type: 'string'}])];
            const drag = {from: {nodeId: 1, output: 'out'}};
            expect(getDraggingConnectionColor(drag)).toBe(getTypeColorHex('string'));
        });
    });

    describe('renderDraggingConnection', () => {
        it('returns null when not dragging', () => {
            draggingConnection.value = null;
            expect(renderDraggingConnection()).toBeNull();
        });

        it('returns an SVG path string when dragging', () => {
            draggingConnection.value = {
                type: 'output',
                start: {x: 10, y: 20},
                mouse: {x: 110, y: 120}
            };
            const path = renderDraggingConnection();
            expect(typeof path).toBe('string');
            expect(path.startsWith('M')).toBe(true);
            expect(path.includes('C')).toBe(true);
        });
    });

    describe('isActionFlow', () => {
        it('detects action flow for partial connection using exec output', () => {
            nodes.value = [makeNode(1, [], [{name: 'Then', type: 'exec'}])];
            expect(isActionFlow({from: {nodeId: 1, output: 'Then'}})).toBe(true);
        });

        it('detects data flow as false for full data connection', () => {
            nodes.value = [makeNode(1, [], [{name: 'out', type: 'int'}]), makeNode(2, [{name: 'in', type: 'int'}], [])];
            const conn = {from: {nodeId: 1, output: 'out'}, to: {nodeId: 2, input: 'in'}};
            expect(isActionFlow(conn)).toBe(false);
        });
    });
});
