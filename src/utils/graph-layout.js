/**
 * Graph auto-layout (generic).
 *
 * A lowered graph comes back with naive positions — fine for the data, useless to
 * read. This lays it out like a blueprint: execution flows LEFT→RIGHT along exec
 * pins, branches fan out DOWNWARD, and the value nodes feeding a step stack ABOVE
 * it. Each entry (an exec node with an exec-out and no exec-in — e.g. a function)
 * starts its own lane down the canvas.
 *
 * Pure: mutates and returns the passed graph's node x/y. Robust to cycles.
 */

const COL_W = 300; // horizontal gap between exec steps
const ROW_H = 150; // vertical gap between stacked branch paths
const LANE_GAP = 260; // gap between entry lanes
const DATA_UP = 140; // how far a value node sits above its consumer
const DATA_STEP = 26; // per-provider stagger so siblings don't overlap

const isExecPin = (io) => io && String(io.type).toLowerCase() === 'exec';
const hasExecOut = (n) => (n.outputs || []).some(isExecPin);
const hasExecIn = (n) => (n.inputs || []).some(isExecPin);
const isExecNode = (n) => hasExecOut(n) || hasExecIn(n);

export function layoutGraph(graph) {
    const nodes = (graph && graph.nodes) || [];
    const conns = (graph && graph.connections) || [];
    if (!nodes.length) return graph;

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const execOut = new Map(); // id -> [successor ids] via exec edges
    const dataInto = new Map(); // consumer id -> [provider ids] via data edges

    for (const c of conns) {
        const from = byId.get(c.from?.nodeId);
        const to = byId.get(c.to?.nodeId);
        if (!from || !to) continue;
        const fromPin = (from.outputs || []).find((o) => o.name === c.from.output);
        if (fromPin && isExecPin(fromPin)) {
            if (!execOut.has(from.id)) execOut.set(from.id, []);
            execOut.get(from.id).push(to.id);
        } else {
            if (!dataInto.has(to.id)) dataInto.set(to.id, []);
            dataInto.get(to.id).push(from.id);
        }
    }

    const placed = new Set();

    // Value nodes feeding a consumer, stacked upward and slightly left.
    function placeData(consumerId, cx, cy, up) {
        const providers = (dataInto.get(consumerId) || []).filter((pid) => {
            const p = byId.get(pid);
            return p && !isExecNode(p) && !placed.has(pid);
        });
        providers.forEach((pid, i) => {
            const n = byId.get(pid);
            placed.add(pid);
            n.x = cx - 40 + i * DATA_STEP;
            n.y = cy - DATA_UP * up - i * DATA_STEP;
            placeData(pid, n.x, n.y, up + 1);
        });
    }

    // Exec subtree from (x,y). Linear chains extend right at the same y; branches
    // fan downward. Returns the greatest y consumed, so siblings/lanes can clear it.
    function placeExec(id, x, y) {
        if (placed.has(id)) return y;
        placed.add(id);
        const n = byId.get(id);
        n.x = x;
        n.y = y;
        placeData(id, x, y, 1);
        const succ = (execOut.get(id) || []).filter((sid) => !placed.has(sid));
        if (succ.length === 0) return y;
        if (succ.length === 1) return placeExec(succ[0], x + COL_W, y);
        let branchY = y;
        for (const sid of succ) {
            branchY = placeExec(sid, x + COL_W, branchY);
            branchY += ROW_H;
        }
        return branchY - ROW_H;
    }

    // Entries first, each its own lane; then any exec nodes not reached (e.g. a
    // statement stranded after a branch); then any leftover value nodes.
    const entries = nodes.filter((n) => isExecNode(n) && hasExecOut(n) && !hasExecIn(n));
    let laneY = 80;
    for (const e of entries) {
        if (placed.has(e.id)) continue;
        const bottom = placeExec(e.id, 220, laneY);
        laneY = bottom + LANE_GAP;
    }
    for (const n of nodes) {
        if (isExecNode(n) && !placed.has(n.id)) {
            const bottom = placeExec(n.id, 220, laneY);
            laneY = bottom + LANE_GAP;
        }
    }
    for (const n of nodes) {
        if (!placed.has(n.id)) {
            n.x = 40;
            n.y = laneY;
            laneY += ROW_H;
        }
    }
    return graph;
}
