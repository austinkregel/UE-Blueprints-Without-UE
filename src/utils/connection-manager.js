import { ref } from 'vue';
import { log, nodes } from './state.js';

export const connections = ref([]);

function connectionKey(conn) {
    return `${conn.from.nodeId}:${conn.from.output}->${conn.to.nodeId}:${conn.to.input}`;
}

export function getConnections() {
    return connections.value ?? [];
}

export function addConnection({ from, to }) {
    if (!from?.nodeId || !to?.nodeId) {
        log('Invalid connection: missing nodeId', { from, to });
        return;
    }
    // Prevent duplicate connections
    if (connections.value.some((conn) => connectionKey(conn) === connectionKey({ from, to }))) {
        log('Connection already exists', { from, to });
        return;
    }
    // Prevent self-connection
    if (from.nodeId === to.nodeId) {
        log('Self-connection not allowed', { from, to });
        return;
    }
    // Validate IO types
    const fromNode = nodes.value.find((n) => n.id === from.nodeId);
    const toNode = nodes.value.find((n) => n.id === to.nodeId);
    if (!fromNode || !toNode) return;
    const fromOut = fromNode.outputs?.find((o) => (o.name || o) === from.output);
    const toIn = toNode.inputs?.find((i) => (i.name || i) === to.input);
    const fromType = fromOut?.type;
    const toType = toIn?.type;
    if (!fromType || !toType) return;

    const isExec = (t) => String(t || '').toLowerCase() === 'exec';
    // Allow exec-to-exec regardless of names (Then 0, True, etc.)
    if (isExec(fromType) && isExec(toType)) {
        // Enforce single-connection per IO: remove any existing on same from-output or to-input
        const before = connections.value.length;
        connections.value = (connections.value || []).filter((c) => {
            const sameFrom = c.from?.nodeId === from.nodeId && c.from?.output === from.output;
            const sameTo = c.to?.nodeId === to.nodeId && c.to?.input === to.input;
            return !(sameFrom || sameTo);
        });
        const removed = before - connections.value.length;
        if (removed > 0) log(`Replaced ${removed} existing connection(s) for exec IO`, { from, to });
        connections.value.push({ from, to });
        return;
    }
    // Disallow mixing exec with data
    if (isExec(fromType) !== isExec(toType)) {
        log('Incompatible types (exec/data mismatch)', { fromType, toType, from, to });
        return;
    }
    // For data, types must match (casting handled elsewhere)
    if (fromType !== toType) {
        log('Incompatible data types', { fromType, toType, from, to });
        return;
    }
    // Enforce single-connection per IO: remove any existing on same from-output or to-input
    const before = connections.value.length;
    connections.value = (connections.value || []).filter((c) => {
        const sameFrom = c.from?.nodeId === from.nodeId && c.from?.output === from.output;
        const sameTo = c.to?.nodeId === to.nodeId && c.to?.input === to.input;
        return !(sameFrom || sameTo);
    });
    const removed = before - connections.value.length;
    if (removed > 0) log(`Replaced ${removed} existing connection(s) for data IO`, { from, to });
    connections.value.push({ from, to });
}

export function removeConnection({ from, to }) {
    const key = connectionKey({ from, to });
    connections.value = connections.value.filter((conn) => connectionKey(conn) !== key);
    log('Connection removed', { from, to });
}

export function clearConnections() {
    connections.value = [];
    log('All connections cleared');
}

// Remove connections whose endpoints reference nodes or pins that no longer exist
export function pruneDanglingConnections() {
    const nodeById = new Map((nodes.value || []).map((n) => [n.id, n]));
    const before = connections.value.length;
    connections.value = (connections.value || []).filter((conn) => {
        const fromNode = nodeById.get(conn?.from?.nodeId);
        const toNode = nodeById.get(conn?.to?.nodeId);
        if (!fromNode || !toNode) return false;
        // Validate pins
        const outName = conn.from?.output;
        const inName = conn.to?.input;
        const hasOut = (fromNode.outputs || []).some((o) => (o.name || o) === outName);
        const hasIn = (toNode.inputs || []).some((i) => (i.name || i) === inName);
        return hasOut && hasIn;
    });
    const removed = before - connections.value.length;
    if (removed > 0) log(`Pruned ${removed} dangling connection(s)`);
}
