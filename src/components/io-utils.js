import {ioPositions, log} from './base-node-utils';

export function registerIO({ nodeId, type, name, x, y }) {
    if (!ioPositions.value[nodeId]) ioPositions.value[nodeId] = { inputs: {}, outputs: {} };
    console.log('Registering IO:', { nodeId, type, name, x, y });
    ioPositions.value[nodeId][type + 's'][name] = { x, y };
}

export function getConnectionPointsArray(conn) {
    const from = ioPositions.value[conn.from.nodeId]?.outputs?.[conn.from.output];
    const to = ioPositions.value[conn.to.nodeId]?.inputs?.[conn.to.input];
    if (!from || !to) return null;
    return [from, to];
}

export function renderConnectionPath(points, { offset = true } = {}) {
    if (!points || points.length < 2) return '';
    const start = offset ? { x: points[0].x, y: points[0].y } : points[0];
    const end = offset ? { x: points[points.length - 1].x, y: points[points.length - 1].y } : points[points.length - 1];
    // Stick out in the direction of the connection, then curve
    const stickOut = 40;
    // Calculate direction vector
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    // Normalize direction
    const nx = dx / length;
    const ny = dy / length;
    // Control points stick out from start/end in the direction of the connection
    const c1x = start.x + nx * stickOut;
    const c1y = start.y + ny * stickOut;
    const c2x = end.x - nx * stickOut;
    const c2y = end.y - ny * stickOut;
    return `M${start.x},${start.y} C${c1x},${c1y} ${c2x},${c2y} ${end.x},${end.y}`;
}

export function registerAllIOForNode(node, nodeRef) {
    if (!node || !nodeRef) return;
    ['input', 'output'].forEach(type => {
        const ioList = type === 'input' ? node.inputs : node.outputs;
        const elList = nodeRef.querySelectorAll('.io.' + type);
        elList.forEach((el, idx) => {
            const io = ioList[idx];
            if (!io) return;
            const rect = el.getBoundingClientRect();
            const ioName = io.name || io;
            registerIO({
                nodeId: node.id,
                type,
                name: ioName,
                x: rect.left + (type === 'input' ? 10 : (rect.width ?? 0) - 10)  + window.scrollX,
                y: rect.top + 10 + window.scrollY,
            });
        });
    });
}
