import { draggingConnection, nodes } from './state.js';
import { renderConnectionPath } from './io-utils.js';
import { getTypeColorHex } from './language-definition.js';

export function getConnectionColor(conn) {
    if (!conn || !conn.from || !conn.to) return '#6b7280';
    const fromNode = nodes.value.find((n) => n.id === conn.from.nodeId);
    const toNode = nodes.value.find((n) => n.id === conn.to.nodeId);
    if (!fromNode || !toNode) return '#6b7280';
    const fromOutput = fromNode.outputs?.find((o) => (o.name || o) === conn.from.output);
    const toInput = toNode.inputs?.find((i) => (i.name || i) === conn.to.input);
    if (!fromOutput || !toInput) return '#6b7280';
    const outputType = fromOutput.type || 'mixed';
    return getTypeColorHex(outputType);
}

export function getDraggingConnectionColor(draggingConn) {
    if (!draggingConn || !draggingConn.from) return '#6b7280';
    const fromNode = nodes.value.find((n) => n.id === draggingConn.from.nodeId);
    if (!fromNode) return '#6b7280';
    const fromOutput = fromNode.outputs?.find((o) => (o.name || o) === draggingConn.from.output);
    if (!fromOutput) return '#6b7280';
    const outputType = fromOutput.type || 'mixed';
    return getTypeColorHex(outputType);
}

export function renderDraggingConnection() {
    if (!draggingConnection.value) return null;
    const { start, mouse, type } = draggingConnection.value;
    const points = [start, mouse];
    const startDirection = type === 'input' ? 'left' : 'right';
    const endDirection = type === 'input' ? 'right' : 'left';
    return renderConnectionPath(points, { startDirection, endDirection });
}

export function isActionFlow(conn) {
    const isExec = (t) => String(t || '').toLowerCase() === 'exec';
    if (conn && (!conn.from || !conn.to)) {
        if (conn.from?.nodeId && conn.from?.output) {
            const fromNode = nodes.value.find((n) => n.id === conn.from.nodeId);
            const out = fromNode?.outputs?.find((o) => (o.name || o) === conn.from.output);
            return isExec(out?.type);
        }
        if (conn.to?.nodeId && conn.to?.input) {
            const toNode = nodes.value.find((n) => n.id === conn.to.nodeId);
            const inn = toNode?.inputs?.find((i) => (i.name || i) === conn.to.input);
            return isExec(inn?.type);
        }
        return false;
    }
    const fromNode = nodes.value.find((n) => n.id === conn.from?.nodeId);
    const toNode = nodes.value.find((n) => n.id === conn.to?.nodeId);
    const out = fromNode?.outputs?.find((o) => (o.name || o) === conn.from?.output);
    const inn = toNode?.inputs?.find((i) => (i.name || i) === conn.to?.input);
    return isExec(out?.type) || isExec(inn?.type);
}
