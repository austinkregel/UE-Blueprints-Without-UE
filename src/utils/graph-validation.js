/**
 * Engine-driven graph validation (generic).
 *
 * These rules are grounded in the engine's own model of the graph — the type
 * system, the exec-flow topology, and the live connections — not surface guesses.
 * They are the built-in validators run by getNodeIssues (node-inspector.js);
 * domains add further rules on top via registerNodeValidator.
 *
 * An Issue is { level, title, body?, field?, fixes?:[{label, apply}] }.
 */

import { nodes as nodesRef } from './state.js';
import { areTypesCompatible } from './language-definition.js';

function ioType(node, name, kind) {
    const arr = node?.[kind] || [];
    const io = arr.find((x) => x && x.name === name);
    return io ? io.type : undefined;
}

const isExec = (t) => String(t).toLowerCase() === 'exec';
const isLoose = (t) => !t || String(t).toLowerCase() === 'mixed';

/**
 * Exec reachability: a node that has an execution input but none of them are
 * wired can never be reached, so it will not run. (Entry nodes have an exec
 * OUTPUT and no exec input, so they are not flagged.)
 */
export function orphanExecRule(node, ctx = {}) {
    const conns = ctx.connections || [];
    const execIns = (node.inputs || []).filter((i) => i && isExec(i.type));
    if (execIns.length === 0) return [];
    const anyWired = execIns.some((i) => conns.some((c) => c.to?.nodeId === node.id && c.to?.input === i.name));
    if (anyWired) return [];
    return [
        {
            level: 'warn',
            title: 'No incoming execution',
            body: 'This node has an execution input but nothing is wired to it, so it will never run.',
            field: execIns[0].name
        }
    ];
}

/**
 * Type safety: every incoming connection must carry a type the target input
 * accepts (per the engine's type-compatibility rules). Exec/mixed pins are skipped.
 */
export function typeMismatchRule(node, ctx = {}) {
    const incoming = (ctx.connections || []).filter((c) => c.to?.nodeId === node.id);
    if (incoming.length === 0) return [];
    const all = nodesRef.value || [];
    const issues = [];
    for (const c of incoming) {
        const src = all.find((n) => n.id === c.from?.nodeId);
        if (!src) continue;
        const outT = ioType(src, c.from.output, 'outputs');
        const inT = ioType(node, c.to.input, 'inputs');
        if (isExec(outT) || isExec(inT) || isLoose(outT) || isLoose(inT)) continue;
        if (!areTypesCompatible(outT, inT)) {
            issues.push({
                level: 'error',
                title: 'Type mismatch',
                body: `${c.from.output} (${outT}) → ${c.to.input} (${inT}) are not compatible.`,
                field: c.to.input
            });
        }
    }
    return issues;
}

/**
 * Unset input: a non-exec input with neither a value nor an incoming connection
 * carries nothing at runtime.
 */
export function unsetInputRule(node, ctx = {}) {
    const conns = ctx.connections || [];
    const issues = [];
    for (const inp of node.inputs || []) {
        if (!inp || typeof inp !== 'object' || isExec(inp.type)) continue;
        const hasValue = inp.defaultValue !== undefined && inp.defaultValue !== null && inp.defaultValue !== '';
        const hasConn = conns.some((c) => c.to?.nodeId === node.id && c.to?.input === inp.name);
        if (!hasValue && !hasConn) {
            issues.push({
                level: 'warn',
                title: `“${inp.name}” is unset`,
                body: `Parameter ${inp.name} (${inp.type}) has no value and no incoming connection, so it will be empty at runtime.`,
                field: inp.name
            });
        }
    }
    return issues;
}

// The built-in engine rules, in report order (errors first).
export const BUILTIN_RULES = [typeMismatchRule, orphanExecRule, unsetInputRule];
