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
    // Only offset if requested (default: true)
    const start = offset ? { x: points[0].x, y: points[0].y } : points[0];
    const end = offset ? { x: points[points.length - 1].x, y: points[points.length - 1].y } : points[points.length - 1];
    let d = `M${start.x},${start.y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = i === 0 ? start : points[i - 1] || points[i];
        const p1 = i === 0 ? start : points[i];
        const p2 = i === points.length - 2 ? end : points[i + 1];
        const p3 = i === points.length - 2 ? end : points[i + 2] || p2;
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
    }
    return d;
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
