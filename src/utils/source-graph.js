/**
 * Source → graph (Tauri-only).
 *
 * Lowers real source files into a node graph via the Rust backend's
 * `parse_code_to_graph` (tree-sitter). This is how a content-browser document
 * that points at a real file becomes an actual graph of its logic — not a stub.
 *
 * Uses dynamic import of the Tauri API (the deliberate Tauri-only exception the
 * codebase already makes in file-tree.js / language-spec-loader.js). In a plain
 * browser (no Tauri) every function returns null so callers fall back.
 */

import { layoutGraph } from './graph-layout.js';

function isTauri() {
    return typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';
}

/** Parse a source string into { nodes, connections, warnings } for the given language, or null. */
export async function parseSourceToGraph(source, language) {
    if (!isTauri() || !source || !language) return null;
    const { invoke } = await import('@tauri-apps/api/core');
    const res = await invoke('parse_code_to_graph', { lang: language, text: source });
    if (!res || !Array.isArray(res.nodes)) return null;
    const graph = {
        nodes: res.nodes,
        connections: Array.isArray(res.connections) ? res.connections : [],
        warnings: Array.isArray(res.warnings) ? res.warnings : []
    };
    // Positions from the parser are naive; lay the graph out so the flow reads.
    layoutGraph(graph);
    return graph;
}

/** Read a file's text via the backend, or null when not under Tauri. */
export async function readSourceFile(path) {
    if (!isTauri() || !path) return null;
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('read_text_file', { path });
}

/** Read a real file and lower it to a graph, or null when unavailable. */
export async function graphFromSourceFile(file, language) {
    const source = await readSourceFile(file);
    if (source == null) return null;
    return await parseSourceToGraph(source, language);
}
