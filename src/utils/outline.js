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

import { getCategoryColor, getCategoryInfo, getCategoryName } from './language-definition.js';

let outlineProvider = null;

/** Register the outline provider: (ctx) => Section[]. Latest wins. */
export function registerOutlineProvider(fn) {
    outlineProvider = typeof fn === 'function' ? fn : null;
}

// Generic fallback: group the graph's nodes by category, plus a Variables section.
function fallbackSections({ nodes = [], variables = [] } = {}) {
    const byCat = new Map();
    for (const node of nodes) {
        const cat = node.category || (node.type ? String(node.type).toUpperCase() : 'OTHER');
        if (!byCat.has(cat)) byCat.set(cat, []);
        byCat.get(cat).push({
            id: `n:${node.id}`,
            label: node.name || node.nodeDefId || `Node ${node.id}`,
            icon: getCategoryInfo(cat)?.icon,
            color: getCategoryColor(cat),
            nodeId: node.id
        });
    }
    const sections = [...byCat.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([cat, items]) => ({
            id: cat,
            title: getCategoryName(cat),
            icon: getCategoryInfo(cat)?.icon,
            color: getCategoryColor(cat),
            items
        }));

    if (variables.length) {
        sections.push({
            id: 'VARIABLES',
            title: 'Variables',
            icon: 'variable',
            color: 'purple',
            items: variables.map((v) => ({
                id: `v:${v.name}`,
                label: v.name,
                kind: v.type || 'mixed',
                color: 'purple'
            }))
        });
    }
    return sections;
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
