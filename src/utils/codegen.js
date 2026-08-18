/**
 * Codegen (generic, format-agnostic).
 *
 * The engine lowers a graph into a small language-agnostic IR and exposes a
 * registry of codegen TARGETS. A domain (e.g. mercs2 → Lua) registers a target
 * that turns the IR into source. Nothing here knows any target language.
 *
 * IR shape (from buildGraphIR):
 *   { entries: [{ entry: Node, steps: Step[] }], nodes, connections }
 *   Step = { node: Node, inputs: [{ name, type, value }] }
 *   value = { kind: 'literal', value } | { kind: 'ref', nodeId, output, node }
 */

const isExec = (t) => String(t).toLowerCase() === 'exec';

/** A node is an entry point if it drives execution out but takes none in. */
export function isEntryPointNode(node) {
    const hasExecOut = (node.outputs || []).some((o) => o && isExec(o.type));
    const hasExecIn = (node.inputs || []).some((i) => i && isExec(i.type));
    return hasExecOut && !hasExecIn;
}

/**
 * Lower a graph into the generic IR: entry points, each with its linearized
 * primary exec flow, and every non-exec input resolved to a literal or a ref.
 */
export function buildGraphIR({ nodes = [], connections = [] } = {}) {
    const byId = new Map(nodes.map((n) => [n.id, n]));

    const inputValue = (node, input) => {
        const conn = connections.find((c) => c.to?.nodeId === node.id && c.to?.input === input.name);
        if (conn) {
            return { kind: 'ref', nodeId: conn.from.nodeId, output: conn.from.output, node: byId.get(conn.from.nodeId) || null };
        }
        return { kind: 'literal', value: input.defaultValue };
    };

    const nextExec = (nodeId, outputName) => {
        const conn = connections.find((c) => c.from?.nodeId === nodeId && c.from?.output === outputName);
        return conn ? byId.get(conn.to.nodeId) || null : null;
    };

    // Follow the primary exec output from a node, in order, without revisiting.
    function linearize(startNode) {
        const steps = [];
        const seen = new Set();
        let node = startNode ? nextExec(startNode.id, (startNode.outputs || []).find((o) => o && isExec(o.type))?.name) : null;
        while (node && !seen.has(node.id)) {
            seen.add(node.id);
            const inputs = (node.inputs || [])
                .filter((i) => i && !isExec(i.type))
                .map((i) => ({ name: i.name, type: i.type, value: inputValue(node, i) }));
            steps.push({ node, inputs });
            const execOut = (node.outputs || []).find((o) => o && isExec(o.type));
            node = execOut ? nextExec(node.id, execOut.name) : null;
        }
        return steps;
    }

    const entries = nodes.filter(isEntryPointNode).map((entry) => ({ entry, steps: linearize(entry) }));
    return { entries, nodes, connections };
}

// ---- target registry ----
const targets = new Map();

/** Register a codegen target: name → (graph) => { code, language }. Latest wins. */
export function registerCodegenTarget(name, fn) {
    if (typeof name === 'string' && typeof fn === 'function') targets.set(name, fn);
}

/** The names of registered targets. */
export function getCodegenTargets() {
    return [...targets.keys()];
}

/**
 * Run a target over a graph. Returns { code, language } or throws if the target
 * is unknown. A target error is wrapped, not swallowed.
 */
export function runCodegen(name, graph) {
    const fn = targets.get(name);
    if (!fn) throw new Error(`No codegen target "${name}"`);
    const out = fn(graph);
    if (typeof out === 'string') return { code: out, language: name };
    return { code: out?.code ?? '', language: out?.language ?? name };
}
