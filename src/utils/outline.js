/**
 * Script outline model (generic, format-agnostic).
 *
 * The left panel renders a set of outline SECTIONS. A domain can register a
 * provider that shapes the active graph into its own sections (e.g. a mission's
 * SCRIPT / EVENTS / OBJECTIVES / VARIABLES); with no provider the engine falls
 * back to grouping nodes by category plus a Variables section.
 *
 * Shapes:
 *   Section = { id, title, hint?, icon?, color?, addable?, items: Item[] }
 *   Item    = { id, label, icon?, kind?, color?, nodeId?, issueCount? }
 * nodeId links an item to a graph node (click selects it). Everything is plain
 * data so the outline component stays domain-agnostic.
 */

import { ref } from 'vue';

let outlineProvider = null;

// Bumped whenever the provider changes so reactive consumers (the outline panel)
// recompute — plugins register their provider after the app has mounted.
export const outlineRevision = ref(0);

/** Register the outline provider: (ctx) => Section[]. Latest wins. */
export function registerOutlineProvider(fn) {
    outlineProvider = typeof fn === 'function' ? fn : null;
    outlineRevision.value++;
}

// A node is an entry point (an "event"/graph root) if it drives execution out but
// takes none in — the natural place authoring starts, like a UE event node.
function isEntryPoint(node) {
    const hasExecOut = (node.outputs || []).some((o) => o && String(o.type).toLowerCase() === 'exec');
    const hasExecIn = (node.inputs || []).some((i) => i && String(i.type).toLowerCase() === 'exec');
    return hasExecOut && !hasExecIn;
}

// Generic fallback: the blueprint's FOUNDATIONAL PRIMITIVES (UE "My Blueprint"
// style) — Events (entry points) and Variables — not every placed node. Placed
// logic/action nodes belong on the canvas, not in this panel.
function fallbackSections({ nodes = [], variables = [] } = {}) {
    const events = nodes
        .filter((n) => n.type !== 'variable' && isEntryPoint(n))
        .map((n) => ({
            id: `n:${n.id}`,
            label: n.name || n.nodeDefId || `Node ${n.id}`,
            icon: 'event',
            color: 'red',
            nodeId: n.id
        }));

    return [
        { id: 'EVENTS', title: 'Events', hint: 'entry points', icon: 'event', color: 'red', addable: true, items: events },
        {
            id: 'VARIABLES',
            title: 'Variables',
            icon: 'variable',
            color: 'purple',
            addable: true,
            items: variables.map((v) => {
                const vn = nodes.find((n) => n.type === 'variable' && n.varName === v.name);
                return { id: `v:${v.name}`, label: v.name, kind: v.type || 'mixed', color: 'purple', nodeId: vn ? vn.id : undefined };
            })
        }
    ];
}

/**
 * Get the outline sections for the current context ({ nodes, variables }), from
 * the registered provider or the generic fallback.
 */
export function getOutlineSections(ctx = {}) {
    if (outlineProvider) {
        try {
            const r = outlineProvider(ctx);
            if (Array.isArray(r)) return r;
        } catch {
            /* a bad provider must not break the outline */
        }
    }
    return fallbackSections(ctx);
}
