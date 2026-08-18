/**
 * Domain plugin host (generic).
 *
 * A domain can register CODE the data specs can't carry — validators, preview
 * renderers, node definitions — by shipping a plain JS bundle that the engine
 * loads via a <script> tag (deliberately NOT dynamic import()) and that calls the
 * global `registerBlueprintPlugin(fn)`. The engine hands the plugin a frozen API;
 * nothing domain-specific lives here.
 */

import { getCategoryInfo, registerExtraNodeCategories, registerExtraNodeDefinitions } from './language-definition.js';
import { registerNodePreviewProvider, registerNodeValidator } from './node-inspector.js';
import { registerOutlineProvider } from './outline.js';
import { buildGraphIR, registerCodegenTarget } from './codegen.js';
import { registerContentSource } from './content-browser.js';
import { createNodeFromDefinition } from './node-factory.js';

// The surface a plugin receives. Generic registration hooks + read-only lookups.
const PLUGIN_API = Object.freeze({
    registerExtraNodeDefinitions,
    registerExtraNodeCategories,
    registerNodeValidator,
    registerNodePreviewProvider,
    registerOutlineProvider,
    registerCodegenTarget,
    registerContentSource,
    getCategoryInfo,
    buildGraphIR,
    // Build a fully-formed node object from a registered definition (id, pins,
    // position) WITHOUT adding it to the graph — for a content source that
    // hydrates a document's starter graph on open.
    createNode: createNodeFromDefinition
});

// Expose the global a plugin bundle calls. Idempotent.
export function installPluginGlobal() {
    if (typeof window === 'undefined') return;
    window.registerBlueprintPlugin = (fn) => {
        if (typeof fn !== 'function') return;
        try {
            fn(PLUGIN_API);
        } catch (e) {
            console.error('[plugin] registration failed', e);
        }
    };
}

function injectScript(src) {
    return new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = false; // preserve manifest order
        s.onload = () => resolve(true);
        s.onerror = () => {
            console.warn(`[plugin] failed to load ${src}`);
            resolve(false);
        };
        document.head.appendChild(s);
    });
}

/**
 * Load domain plugins listed in a manifest (a JSON array of script URLs). No-op
 * when the manifest is absent (e.g. no domain installed), so the engine runs bare.
 */
export async function loadPlugins(manifestUrl = '/plugins.json') {
    installPluginGlobal();
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    try {
        const res = await fetch(manifestUrl);
        if (!res.ok) return;
        const list = await res.json();
        if (!Array.isArray(list)) return;
        for (const url of list) {
            if (typeof url === 'string') await injectScript(url);
        }
    } catch {
        /* no manifest → no plugins, that's fine */
    }
}
