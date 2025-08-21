// Load extra node definitions from a JSON file and register them
import {registerExtraNodeDefinitions} from './language-definition.js';

function isTauri() {
    return typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';
}

export async function loadLanguageDefinitionsFromUrl(url = '/language-extras.json') {
    try {
        if (!url) return false;
        // Try fetch for browser
        const res = await fetch(url);
        if (!res.ok) return false;
        const json = await res.json();
        if (json && typeof json === 'object') {
            registerExtraNodeDefinitions(json);
            return true;
        }
    } catch (_) {
    }
    return false;
}

export async function loadLanguageDefinitionsFromPath(path) {
    if (!isTauri()) return false;
    try {
        const {readTextFile} = await import('@tauri-apps/plugin-fs');
        const txt = await readTextFile(path);
        const json = JSON.parse(txt);
        registerExtraNodeDefinitions(json);
        return true;
    } catch (_) {
        return false;
    }
}
