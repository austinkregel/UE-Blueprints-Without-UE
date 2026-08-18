/**
 * Minimap geometry (pure).
 *
 * Fits the union of all node positions and the current visible region (world
 * corners tl/br) into a fixed-size minimap, producing blip positions and a
 * viewport rectangle in minimap-pixel space.
 */

/**
 * @param {{ nodes, tl:{x,y}, br:{x,y}, mm:{w,h,pad,nodeW,nodeH} }} args
 * @returns {{ blips:[{id,x,y}], view:{x,y,w,h}, minX, minY, scale }}
 */
export function computeMinimapLayout({ nodes = [], tl, br, mm }) {
    const { w, h, pad, nodeW, nodeH } = mm;
    let minX = Math.min(tl.x, br.x);
    let minY = Math.min(tl.y, br.y);
    let maxX = Math.max(tl.x, br.x);
    let maxY = Math.max(tl.y, br.y);
    for (const n of nodes) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + nodeW);
        maxY = Math.max(maxY, n.y + nodeH);
    }
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const scale = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh);
    const map = (wx, wy) => ({ x: pad + (wx - minX) * scale, y: pad + (wy - minY) * scale });
    const blips = nodes.map((n) => ({ id: n.id, ...map(n.x, n.y) }));
    const v1 = map(tl.x, tl.y);
    const v2 = map(br.x, br.y);
    const view = { x: Math.min(v1.x, v2.x), y: Math.min(v1.y, v2.y), w: Math.abs(v2.x - v1.x), h: Math.abs(v2.y - v1.y) };
    return { blips, view, minX, minY, scale };
}

/** Convert a minimap-pixel point back to a world coordinate. Pure. */
export function minimapPointToWorld(px, py, layout, pad) {
    if (!layout.scale) return { x: layout.minX, y: layout.minY };
    return { x: layout.minX + (px - pad) / layout.scale, y: layout.minY + (py - pad) / layout.scale };
}
