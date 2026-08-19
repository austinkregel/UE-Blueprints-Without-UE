/**
 * Classify lowered nodes so they don't all read as generic "functions".
 *
 * A resolved node (one that matched a real definition, so it has a nodeDefId)
 * takes its glyph + color from its category. But the lowering also emits nodes
 * with no definition — branches, operators, entries, bare calls — and those all
 * defaulted to the function glyph. Here we give each a specific look by SHAPE:
 * a branch has then/else, an operator has a+b→result, an entry drives exec out
 * with none in, a getter is named Get/Is/Has. Pure structure, no hardcoded lists.
 */

const isExecType = (t) => String(t).toLowerCase() === 'exec';
const hasIn = (n, name) => (n.inputs || []).some((i) => i && i.name === name);
const hasOut = (n, name) => (n.outputs || []).some((o) => o && o.name === name);
const execOut = (n) => (n.outputs || []).some((o) => o && isExecType(o.type));
const execIn = (n) => (n.inputs || []).some((i) => i && isExecType(i.type));

// A read-only call by Lua/engine convention (optionally with a leading underscore).
const PURE = /(^|[.:])_?(Get|Is|Has|Find|Query|Lookup|Can)[A-Z0-9_]/;

/** The glyph + color a generic (undefined) node should wear, or null to leave it. */
export function classifyNode(n) {
    if (!n || n.type !== 'function') return null; // variables etc. keep their own look
    if (hasOut(n, 'then') && hasOut(n, 'else')) return { glyph: 'branch', color: 'gray' };
    if (hasIn(n, 'a') && hasIn(n, 'b') && hasOut(n, 'result')) return { glyph: 'math', color: 'cyan' };
    if (execOut(n) && !execIn(n) && hasOut(n, 'body')) return { glyph: 'event', color: 'red' }; // entry
    if (n.funcName === 'return') return { glyph: 'flow', color: 'gray' };
    if (n.funcName && PURE.test(n.funcName)) return { glyph: 'get', color: 'green' }; // pure getter
    return { glyph: 'method', color: 'blue' }; // generic call
}

/** Apply classification to every un-resolved node in place. Returns the graph. */
export function styleLoweredNodes(graph) {
    for (const n of (graph && graph.nodes) || []) {
        if (n.nodeDefId) continue; // resolved nodes are styled by their category
        const s = classifyNode(n);
        if (s) {
            n.glyph = s.glyph;
            n.color = s.color;
        }
    }
    return graph;
}
