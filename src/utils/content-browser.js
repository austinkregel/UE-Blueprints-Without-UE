/**
 * Content browser model (generic, format-agnostic).
 *
 * The bottom tray is the engine's window onto the openable DOCUMENTS in a
 * project. It knows nothing about files: an entry is a logical unit that carries
 * a folder PATH (how it groups) and a way to hydrate a graph (what opens). A
 * domain registers a content source; the engine folds the flat entry list into a
 * folder/file tree and renders it. With no source the tray is simply empty.
 *
 * Shapes:
 *   Entry  = { id, name, path?: string[], icon?, color?, meta?, open?: () => Graph, graph?: Graph }
 *   Graph  = { name?, nodes: Node[], connections: Connection[] }
 *   Folder = { name, path: string[], folders: Folder[], files: Entry[], count }
 *
 * `path` is the folder trail (['vz', 'PMC'] → vz/PMC/); a missing/empty path puts
 * the entry at the root. `open()` (or an inline `graph`) yields the document the
 * entry loads into a workspace. Everything is plain data so the tray component and
 * the engine stay domain-agnostic — the domain owns the vocabulary (what the
 * folders mean, what a document is), the engine owns the tree.
 */

import { ref } from 'vue';

let contentSource = null;

// Bumped whenever the source changes so the tray recomputes — a domain plugin
// registers (often asynchronously, after fetching its catalog) once mounted.
export const contentRevision = ref(0);

/** Register the content source: () => Entry[] | { entries: Entry[] }. Latest wins. */
export function registerContentSource(fn) {
    contentSource = typeof fn === 'function' ? fn : null;
    contentRevision.value++;
}

/** Pull the entries from the registered source (or [] when none / on error). */
export function getContentEntries() {
    if (!contentSource) return [];
    try {
        const r = contentSource();
        const entries = Array.isArray(r) ? r : r && Array.isArray(r.entries) ? r.entries : [];
        return entries.filter((e) => e && e.id != null);
    } catch {
        // a bad source must not break the tray
        return [];
    }
}

function finalizeFolder(node) {
    const folders = [...node.folders.values()].map(finalizeFolder).sort((a, b) => a.name.localeCompare(b.name));
    const files = [...node.files].sort((a, b) => String(a.name ?? a.id).localeCompare(String(b.name ?? b.id)));
    const count = files.length + folders.reduce((sum, f) => sum + f.count, 0);
    return { name: node.name, path: node.path, folders, files, count };
}

/**
 * Fold a flat entry list into a folder/file tree by each entry's `path`. Pure.
 * Folders and files are sorted by name; each folder carries a recursive `count`
 * of the files beneath it. Returns the root Folder ({ name:'', path:[], ... }).
 */
export function buildContentTree(entries = []) {
    const root = { name: '', path: [], folders: new Map(), files: [] };
    for (const e of entries) {
        if (!e || e.id == null) continue;
        const segs = Array.isArray(e.path) ? e.path.filter((s) => s != null && String(s).length > 0).map(String) : [];
        let cur = root;
        for (const seg of segs) {
            if (!cur.folders.has(seg)) {
                cur.folders.set(seg, { name: seg, path: [...cur.path, seg], folders: new Map(), files: [] });
            }
            cur = cur.folders.get(seg);
        }
        cur.files.push(e);
    }
    return finalizeFolder(root);
}

/**
 * Resolve an entry to a normalized graph document, from its `open()` callback or
 * an inline `graph`. Returns null when the entry yields nothing openable.
 */
export function resolveEntryGraph(entry) {
    if (!entry) return null;
    let g = null;
    if (typeof entry.open === 'function') {
        try {
            g = entry.open();
        } catch {
            g = null;
        }
    } else if (entry.graph) {
        g = entry.graph;
    }
    if (!g || typeof g !== 'object') return null;
    return {
        name: g.name || entry.name || 'Untitled',
        nodes: Array.isArray(g.nodes) ? g.nodes : [],
        connections: Array.isArray(g.connections) ? g.connections : []
    };
}
