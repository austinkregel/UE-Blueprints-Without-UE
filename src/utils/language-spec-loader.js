// Load extra node definitions from a JSON file and register them
import { registerExtraNodeDefinitions, registerExtraNodeCategories } from './language-definition.js';

function isTauri() {
    return typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';
}

// A spec is either the legacy flat form ({ CATEGORY: { nodeId: def } }) or the
// richer form ({ categories: { CATEGORY: {name,color,...} }, nodes: { CATEGORY: {...} } }).
// The richer form lets a domain name/color its own categories.
function applySpec(json) {
    if (!json || typeof json !== 'object') return false;
    if (json.nodes && typeof json.nodes === 'object') {
        if (json.categories && typeof json.categories === 'object' && registerExtraNodeCategories) {
            registerExtraNodeCategories(json.categories);
        }
        registerExtraNodeDefinitions(json.nodes);
        return true;
    }
    registerExtraNodeDefinitions(json);
    return true;
}

export async function loadLanguageDefinitionsFromUrl(url = '/language-extras.json') {
    try {
        if (!url) return false;
        // Try fetch for browser
        const res = await fetch(url);
        if (!res.ok) return false;
        const json = await res.json();
        return applySpec(json);
    } catch (_) {
        return false;
    }
}

export async function loadLanguageDefinitionsFromPath(path) {
    if (!isTauri()) return false;
    try {
        const { readTextFile } = await import('@tauri-apps/plugin-fs');
        const txt = await readTextFile(path);
        const json = JSON.parse(txt);
        return applySpec(json);
    } catch (_) {
        return false;
    }
}
