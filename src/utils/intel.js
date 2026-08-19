/**
 * Corpus intelligence client (Tauri-only).
 *
 * Thin wrappers over the Rust `intel_*` commands (LanceDB + local embeddings),
 * plus the pure logic that folds function-level search hits back into the
 * documents the content browser lists.
 */

function isTauri() {
    return typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';
}

/** The longest shared directory prefix of the entries' files — the tree to index. */
export function commonRoot(entries = []) {
    const files = entries.map((e) => e && e.file).filter(Boolean);
    if (!files.length) return null;
    const split = files.map((f) => f.split('/'));
    const first = split[0];
    let n = first.length;
    for (const parts of split) {
        let i = 0;
        while (i < n && i < parts.length && parts[i] === first[i]) i++;
        n = i;
    }
    return first.slice(0, n).join('/') || '/';
}

/** A stable on-disk location for the LanceDB index (app data dir), or null outside Tauri. */
export async function defaultDbPath() {
    if (!isTauri()) return null;
    const { appDataDir, join } = await import('@tauri-apps/api/path');
    return await join(await appDataDir(), 'corpus-index.lance');
}

/** Build/refresh the semantic index for a source tree. Returns the unit count (0 outside Tauri). */
export async function indexCorpus(root, dbPath) {
    if (!isTauri() || !root || !dbPath) return 0;
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('intel_index_corpus', { root, dbPath });
}

/** Semantic search over the index. Returns [] outside Tauri. Hits: {id,name,path,kind,score}. */
export async function semanticSearch(query, dbPath, k = 30) {
    if (!isTauri() || !query || !dbPath) return [];
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('intel_search', { dbPath, query, k });
}

/**
 * Fold function-level hits back into documents: an entry's relevance is its best
 * (smallest-distance) matching hit, matched by file path. Pure. Returns
 * [{ id, score }] for the matching entries, best first.
 */
export function rankEntriesByHits(entries = [], hits = []) {
    const best = new Map(); // file path -> smallest distance
    for (const h of hits) {
        if (!h || h.path == null) continue;
        const prev = best.get(h.path);
        if (prev === undefined || h.score < prev) best.set(h.path, h.score);
    }
    const ranked = [];
    for (const e of entries) {
        if (e && e.file != null && best.has(e.file)) {
            ranked.push({ id: e.id, score: best.get(e.file) });
        }
    }
    ranked.sort((a, b) => a.score - b.score);
    return ranked;
}
