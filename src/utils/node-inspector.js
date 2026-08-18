/**
 * Node inspector extension points (generic).
 *
 * The inspector can show two domain-flavored things for the selected node:
 *   - validation ISSUES (the warning cards)
 *   - a PREVIEW (e.g. a domain's in-app render of what the node produces)
 *
 * The engine stays domain-agnostic: it ships one generic built-in validator and
 * exposes registration hooks so a domain layer can add its own rules / preview
 * without the engine hard-coding anything domain-specific.
 */

import { BUILTIN_RULES } from './graph-validation.js';

const validators = [];
let previewProvider = null;

/**
 * Register a validator: (node, ctx) => Issue[].
 *
 * An Issue is addressable and actionable:
 *   {
 *     level: 'warn' | 'error' | 'info',
 *     title: string,
 *     body?: string,
 *     field?: string,                       // input/param name this issue anchors to
 *     fixes?: [{ label: string, apply: () => void }]  // one-click remedies
 *   }
 * ctx carries at least { connections }.
 */
export function registerNodeValidator(fn) {
    if (typeof fn === 'function') validators.push(fn);
}

/**
 * Register the preview provider: (node) => { html: string } | null.
 * Latest registration wins (a domain owns the preview surface).
 */
export function registerNodePreviewProvider(fn) {
    previewProvider = typeof fn === 'function' ? fn : null;
}

/**
 * Collect issues for a node from the engine's built-in rules (graph-validation.js)
 * plus any registered domain validators.
 */
export function getNodeIssues(node, ctx = {}) {
    if (!node) return [];
    const all = [];
    for (const v of [...BUILTIN_RULES, ...validators]) {
        try {
            const r = v(node, ctx);
            if (Array.isArray(r)) all.push(...r);
        } catch {
            /* a misbehaving validator must not break the inspector */
        }
    }
    return all;
}

/**
 * Total issue count across a set of nodes (for the status bar / outline badges).
 */
export function getWorkspaceIssueCount(nodeList, ctxBase = {}) {
    let n = 0;
    for (const node of nodeList || []) n += getNodeIssues(node, ctxBase).length;
    return n;
}

/**
 * Get the preview for a node from the registered provider, or null.
 */
export function getNodePreview(node) {
    if (!node || !previewProvider) return null;
    try {
        return previewProvider(node) || null;
    } catch {
        return null;
    }
}
