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

// Built-in, domain-agnostic rule: a non-exec input with neither a value nor an
// incoming connection is unset and won't carry data at runtime.
function unsetParamsValidator(node, ctx) {
    const issues = [];
    const conns = ctx?.connections || [];
    for (const inp of node.inputs || []) {
        if (!inp || typeof inp !== 'object') continue;
        if (String(inp.type).toLowerCase() === 'exec') continue;
        const hasValue = inp.defaultValue !== undefined && inp.defaultValue !== null && inp.defaultValue !== '';
        const hasConn = conns.some((c) => c.to?.nodeId === node.id && c.to?.input === inp.name);
        if (!hasValue && !hasConn) {
            issues.push({
                level: 'warn',
                title: `“${inp.name}” is unset`,
                body: `Parameter ${inp.name} (${inp.type}) has no value and no incoming connection, so it will be empty at runtime.`
            });
        }
    }
    return issues;
}

/**
 * Collect issues for a node from the built-in rule plus any registered validators.
 */
export function getNodeIssues(node, ctx = {}) {
    if (!node) return [];
    const all = [];
    for (const v of [unsetParamsValidator, ...validators]) {
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
