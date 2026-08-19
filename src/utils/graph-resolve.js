/**
 * Resolve a lowered graph against the known node definitions (generic).
 *
 * Tree-sitter gives us syntax, not types — a lowered Lua call is just a name and
 * some argument pins typed "mixed". But the engine already has real, typed
 * signatures for its calls (discovered from the source and registered as node
 * definitions). This pass matches each lowered call by name and adopts that
 * definition's real argument NAMES + TYPES + category, so pins stop being "mixed"
 * and the node reads as its actual API — all from data, nothing hand-mapped.
 *
 * It only overlays DATA inputs (by position) and the node's identity/category;
 * exec pins and outputs are left intact so the flow wiring survives. Baked
 * argument values carry across; connections into renamed pins are remapped.
 */

import { getAllNodeDefinitions } from './language-definition.js';

const isExec = (io) => io && String(io.type).toLowerCase() === 'exec';

// Domain-registered resolvers. A resolver inspects a lowered node (its funcName,
// pins, and the surrounding graph via ctx) and returns the id/name of the real
// definition it represents — e.g. mapping self:CreateChild{sModuleName=…} to the
// concrete objective node. Returns null when it doesn't recognize the node.
const nodeResolvers = [];

/** Register a domain node resolver: (node, ctx) => defId | defName | null. */
export function registerNodeResolver(fn) {
    if (typeof fn === 'function') nodeResolvers.push(fn);
}

/** Test hook: drop all registered resolvers. */
export function clearNodeResolvers() {
    nodeResolvers.length = 0;
}

// Adopt a definition's IDENTITY without disturbing already-named pins — for a
// domain node whose pins the lowering already named (an objective's config fields)
// or whose args must stay (an event's). Sets nodeDefId + category + display name,
// types any input the def also declares, and adds the def's own outputs (an
// objective's outcome exec pins, an event's callback) that aren't present yet.
function adoptIdentity(node, def) {
    node.nodeDefId = def.id;
    if (def.category) node.category = def.category;
    if (def.name) node.name = def.name;
    const defIns = def.inputs || [];
    for (const inp of node.inputs || []) {
        const d = defIns.find((x) => x.name === inp.name);
        if (d && d.type && (!inp.type || inp.type === 'mixed')) inp.type = d.type;
    }
    const outs = node.outputs || (node.outputs = []);
    for (const o of def.outputs || []) {
        if (!outs.some((x) => x.name === o.name)) outs.push({ ...o });
    }
}

/** Index definitions by their call name (e.g. "ObjectFilter.SetFilter"). */
export function indexDefinitionsByName(defs) {
    const byName = new Map();
    for (const id of Object.keys(defs || {})) {
        const d = defs[id];
        if (d && d.name && !byName.has(d.name)) byName.set(d.name, d);
    }
    return byName;
}

function applyDefinition(node, def, connections) {
    node.nodeDefId = def.id;
    if (def.category) node.category = def.category;

    const defDataIns = (def.inputs || []).filter((i) => !isExec(i));
    if (!defDataIns.length) return;

    const oldIns = node.inputs || [];
    const newIns = oldIns.map((io) => ({ ...io }));
    const rename = new Map();
    // Overlay def data inputs onto the node's data inputs, by position.
    let k = 0;
    for (let i = 0; i < newIns.length; i++) {
        if (isExec(newIns[i])) continue;
        const dp = defDataIns[k++];
        if (!dp) break; // extra positional args beyond the signature stay as-is
        const oldName = newIns[i].name;
        const merged = { name: dp.name, type: dp.type || newIns[i].type };
        if (newIns[i].defaultValue !== undefined) merged.defaultValue = newIns[i].defaultValue;
        newIns[i] = merged;
        if (oldName !== dp.name) rename.set(oldName, dp.name);
    }
    node.inputs = newIns;

    if (rename.size) {
        for (const c of connections) {
            if (c.to && c.to.nodeId === node.id && rename.has(c.to.input)) {
                c.to.input = rename.get(c.to.input);
            }
        }
    }
}

/**
 * Adopt real definitions into a lowered graph in place. `defs` defaults to the
 * live registered definitions; pass one in tests. Returns the graph.
 */
export function resolveAgainstDefinitions(graph, defs) {
    const nodes = (graph && graph.nodes) || [];
    const connections = (graph && graph.connections) || [];
    const all = defs || getAllNodeDefinitions();
    const byName = indexDefinitionsByName(all);
    const getDef = (key) => all[key] || byName.get(key) || null;
    const ctx = { nodes, connections, getDef };
    for (const n of nodes) {
        if (n.type !== 'function' || !n.funcName) continue;
        // 1. Domain resolvers first — they identify method calls (objectives,
        //    events) the generic name match can't, and adopt the def's identity.
        let handled = false;
        for (const resolve of nodeResolvers) {
            let res;
            try {
                res = resolve(n, ctx);
            } catch {
                res = null;
            }
            if (!res) continue;
            const def = typeof res === 'string' ? getDef(res) : res && (res.def || getDef(res.defId || res.defName));
            if (def) {
                adoptIdentity(n, def);
                handled = true;
                break;
            }
        }
        if (handled) continue;
        // 2. Generic name match — overlay the real binding signature.
        const def = byName.get(n.funcName);
        if (def) applyDefinition(n, def, connections);
    }
    return graph;
}
