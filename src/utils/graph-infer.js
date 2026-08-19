/**
 * Type inference over a lowered graph (generic — the "IDE" half).
 *
 * Lua carries no static types, so tree-sitter can't hand them to us. But we can
 * HYPOTHESIZE: a literal has a kind, a variable takes the type of what's assigned
 * to it, an operator implies a result type, and types flow along the data edges.
 * This pass runs that inference to a fixpoint, filling in "mixed" pins wherever it
 * can reason a concrete type — best-effort, defaulting back to mixed when unsure.
 *
 * It complements graph-resolve.js: resolve pins the types the engine already KNOWS
 * (real call signatures); this infers the ones it doesn't.
 */

const NUMERIC = new Set(['int', 'float']);
const isExecType = (t) => String(t).toLowerCase() === 'exec';
const known = (t) => t && t !== 'mixed' && !isExecType(t);

function numericJoin(a, b) {
    if (a === 'int' && b === 'int') return 'int';
    if (NUMERIC.has(a) || NUMERIC.has(b)) return 'float';
    return 'mixed';
}

// The result type implied by a Lua binary operator — language semantics, not a
// per-case table: comparisons/logicals are boolean, `..` is string, arithmetic is
// numeric (integer-preserving where both sides are integers).
export function binaryResultType(op, a, b) {
    if (['==', '~=', '<', '>', '<=', '>='].includes(op)) return 'bool';
    if (op === 'and' || op === 'or') return a && a === b ? a : 'bool';
    if (op === 'not') return 'bool';
    if (op === '..') return 'string';
    if (['+', '-', '*', '%', '^', '//'].includes(op)) return numericJoin(a || 'int', b || 'int');
    if (op === '/') return 'float';
    return 'mixed';
}

const isBinary = (n) =>
    n.type === 'function' &&
    n.nodeDefId == null &&
    (n.inputs || []).some((i) => i.name === 'a') &&
    (n.inputs || []).some((i) => i.name === 'b') &&
    (n.outputs || []).some((o) => o.name === 'result');

export function inferTypes(graph) {
    const nodes = (graph && graph.nodes) || [];
    const conns = (graph && graph.connections) || [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const outPin = (id, name) => {
        const n = byId.get(id);
        return n && (n.outputs || []).find((o) => o.name === name);
    };
    const inPin = (id, name) => {
        const n = byId.get(id);
        return n && (n.inputs || []).find((i) => i.name === name);
    };

    // Data edges only (skip exec flow).
    const dataEdges = conns.filter((c) => {
        const op = outPin(c.from?.nodeId, c.from?.output);
        const ip = inPin(c.to?.nodeId, c.to?.input);
        return op && ip && !isExecType(op.type) && !isExecType(ip.type);
    });

    // The best-known type reaching a consumer input: its own type, or its provider's.
    const typeOfInput = (node, pin) => {
        if (known(pin.type)) return pin.type;
        const e = dataEdges.find((c) => c.to.nodeId === node.id && c.to.input === pin.name);
        if (e) {
            const op = outPin(e.from.nodeId, e.from.output);
            if (op && known(op.type)) return op.type;
        }
        return pin.type || 'mixed';
    };

    const env = new Map(); // varName -> hypothesized type

    for (let pass = 0; pass < 8; pass++) {
        let changed = false;

        // Assignments teach the environment; the value pin takes the RHS type.
        for (const n of nodes) {
            if (n.varAction !== 'set' || !n.varName) continue;
            const vp = (n.inputs || []).find((i) => i.name === n.varName);
            if (!vp) continue;
            const t = typeOfInput(n, vp);
            if (!known(t)) continue;
            if (env.get(n.varName) !== t) {
                env.set(n.varName, t);
                changed = true;
            }
            if (vp.type !== t) {
                vp.type = t;
                changed = true;
            }
        }

        // Reads take the variable's hypothesized type.
        for (const n of nodes) {
            if (n.varAction !== 'get' || !n.varName) continue;
            const t = env.get(n.varName);
            const op = (n.outputs || [])[0];
            if (t && op && op.type !== t) {
                op.type = t;
                changed = true;
            }
        }

        // Binary operators imply their result type from the operand types.
        for (const n of nodes) {
            if (!isBinary(n)) continue;
            const a = (n.inputs || []).find((i) => i.name === 'a');
            const b = (n.inputs || []).find((i) => i.name === 'b');
            const rt = binaryResultType(n.funcName, a && typeOfInput(n, a), b && typeOfInput(n, b));
            const op = (n.outputs || []).find((o) => o.name === 'result');
            if (op && known(rt) && op.type !== rt) {
                op.type = rt;
                changed = true;
            }
        }

        // Types flow along data edges into pins still marked mixed.
        for (const c of dataEdges) {
            const op = outPin(c.from.nodeId, c.from.output);
            const ip = inPin(c.to.nodeId, c.to.input);
            if (op && ip && !known(ip.type) && known(op.type)) {
                ip.type = op.type;
                changed = true;
            }
        }

        if (!changed) break;
    }
    return graph;
}
