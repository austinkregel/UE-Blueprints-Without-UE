import {ioPositions, log} from './state.js';
import { screenToWorld } from './viewport-utils.js';

export function registerIO({ nodeId, type, name, x, y }) {
    if (!ioPositions.value[nodeId]) ioPositions.value[nodeId] = { inputs: {}, outputs: {} };
    ioPositions.value[nodeId][type + 's'][name] = { x, y };
}

export function getConnectionPointsArray(conn) {
    const from = ioPositions.value[conn.from.nodeId]?.outputs?.[conn.from.output];
    const to = ioPositions.value[conn.to.nodeId]?.inputs?.[conn.to.input];
    if (!from || !to) return null;
    return [from, to];
}

export function renderConnectionPath(points, { offset = true, startDirection = 'right', endDirection = 'left' } = {}) {
    if (!points || points.length < 2) return '';
    const start = offset ? { x: points[0].x, y: points[0].y } : points[0];
    const end = offset ? { x: points[points.length - 1].x, y: points[points.length - 1].y } : points[points.length - 1];
    
    // Calculate distance between points
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Create curves that flow naturally from outputs (right) to inputs (left)
    // Close connections get more dramatic curves, far ones get wider curves
    const baseCurve = Math.min(200, Math.max(80, distance * 0.4));
    
    // Control points:
    // - First control point: flow OUT from the start side (left/right)
    // - Second control point: flow IN to the end side (left/right)
    const c1x = startDirection === 'left' ? (start.x - baseCurve) : (start.x + baseCurve);
    const c1y = start.y;
    
    const c2x = endDirection === 'right' ? (end.x + baseCurve) : (end.x - baseCurve);
    const c2y = end.y;
    
    return `M${start.x-5},${start.y+5} C${c1x},${c1y} ${c2x},${c2y} ${end.x+5},${end.y+5}`;
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
            
            // Get screen coordinates first
            const screenX = getRectXBasedOnType(type, rect);
            const screenY = getRectYBasedOnType(type, rect);
            
            // Convert to world coordinates for storage
            const worldPos = screenToWorld(screenX, screenY);
            
            registerIO({
                nodeId: node.id,
                type,
                name: ioName,
                x: worldPos.x,
                y: worldPos.y,
            });
        });
    });
}

export function getRectXBasedOnType(type, rect) {
    return rect.left + (type === 'input' ? 10 : (rect.width ?? 0) - 10);
}
export function getRectYBasedOnType(type, rect) {
    return rect.top + 10;
}