// File system tree utilities for Tauri v2
// Use Rust-side commands via invoke for security. Fallbacks preserved for non-Tauri envs when possible.
import * as dialogApi from '@tauri-apps/plugin-dialog';

function isTauriAvailable() {
    return typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';
}

async function getInvoke() {
    try {
        const {invoke} = await import('@tauri-apps/api/core');
        return invoke;
    } catch {
        return null;
    }
}

// Per-directory listing via Rust list_dir command
export async function listDirectory(path) {
    if (!isTauriAvailable()) return [];
    const invoke = await getInvoke();
    if (!invoke) return [];
    try {
        const entries = await invoke('list_dir', {path});
        // Map to UI shape
        return (entries || []).map((e) => ({
            name: e.name,
            path: e.path,
            kind: e.is_dir ? 'dir' : 'file',
            children: e.is_dir ? [] : undefined
        }));
    } catch (e) {
        console.error('listDirectory failed', e);
        return [];
    }
}

export async function readDirectoryTree(root, {includeHidden = false} = {}) {
    if (!isTauriAvailable())
        return {
            name: root?.split('/')?.pop() || 'root',
            path: root,
            kind: 'dir',
            children: [],
            warnings: ['Not running in Tauri']
        };
    const children = (await listDirectory(root)).filter((e) => includeHidden || !e.name?.startsWith('.'));
    return {name: root?.split('/')?.pop() || 'root', path: root, kind: 'dir', children};
}

export async function readText(path) {
    if (!isTauriAvailable()) return '';
    const invoke = await getInvoke();
    if (invoke) {
        try {
            return await invoke('read_text_file', {path});
        } catch (e) {
            console.error('read_text_file failed', e);
            return '';
        }
    }
    // Fallback to dynamic FS guest bindings (non-tauri dev)
    try {
        const fs = await import('@tauri-apps/plugin-fs');
        const readTextFile = fs.readTextFile || fs.readFile;
        return await readTextFile(path);
    } catch {
        return '';
    }
}

async function loadDialog() {
    return dialogApi;
}

export async function pickDirectory() {
    if (!isTauriAvailable()) {
        console.log('Not running in Tauri apparently.');
        return null;
    }
    try {
        const dialog = await loadDialog();
        if (!dialog) {
            console.warn('Dialog API not available');
            return null;
        }
        const dir = await dialog.open({directory: true, multiple: false});
        if (!dir) return null;
        return Array.isArray(dir) ? dir[0] : dir;
    } catch (e) {
        console.error('Failed to open dialog', e);
        return null;
    }
}
