import { describe, expect, it, vi } from 'vitest';

// Isolate module to safely mock its deps without affecting others

describe('language-spec-loader', () => {
    it('loadLanguageDefinitionsFromUrl uses fetch and registers extras on success', async () => {
        vi.resetModules();
        const reg = vi.fn();
        vi.doMock('../language-definition.js', () => ({ registerExtraNodeDefinitions: reg }));
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({ ok: true, json: async () => ({ EXTRA: {} }) }))
        );
        const { loadLanguageDefinitionsFromUrl } = await import('../language-spec-loader.js');
        const ok = await loadLanguageDefinitionsFromUrl('/some.json');
        expect(ok).toBe(true);
        expect(reg).toHaveBeenCalled();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it('loadLanguageDefinitionsFromUrl registers categories + nodes for the richer shape', async () => {
        vi.resetModules();
        const regNodes = vi.fn();
        const regCats = vi.fn();
        vi.doMock('../language-definition.js', () => ({
            registerExtraNodeDefinitions: regNodes,
            registerExtraNodeCategories: regCats
        }));
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                json: async () => ({ categories: { MERCS2_EVENT: { name: 'Events' } }, nodes: { MERCS2_EVENT: {} } })
            }))
        );
        const { loadLanguageDefinitionsFromUrl } = await import('../language-spec-loader.js');
        const ok = await loadLanguageDefinitionsFromUrl('/spec.json');
        expect(ok).toBe(true);
        expect(regCats).toHaveBeenCalledWith({ MERCS2_EVENT: { name: 'Events' } });
        expect(regNodes).toHaveBeenCalledWith({ MERCS2_EVENT: {} });
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it('loadLanguageDefinitionsFromUrl returns false on error', async () => {
        vi.resetModules();
        vi.doMock('../language-definition.js', () => ({ registerExtraNodeDefinitions: vi.fn() }));
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({ ok: false }))
        );
        const { loadLanguageDefinitionsFromUrl } = await import('../language-spec-loader.js');
        const ok = await loadLanguageDefinitionsFromUrl('/bad.json');
        expect(ok).toBe(false);
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it('loadLanguageDefinitionsFromPath reads via tauri fs when tauri env', async () => {
        vi.resetModules();
        const reg = vi.fn();
        vi.doMock('../language-definition.js', () => ({ registerExtraNodeDefinitions: reg }));
        vi.doMock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn().mockResolvedValue('{"EXTRA":{}}') }), { virtual: true });
        Object.assign(window, { __TAURI_INTERNALS__: {} });
        const { loadLanguageDefinitionsFromPath } = await import('../language-spec-loader.js');
        const ok = await loadLanguageDefinitionsFromPath('/path/to.json');
        expect(ok).toBe(true);
        expect(reg).toHaveBeenCalled();
        delete window.__TAURI_INTERNALS__;
        vi.resetModules();
    });

    it('loadLanguageDefinitionsFromPath returns false when not tauri or on errors', async () => {
        vi.resetModules();
        vi.doMock('../language-definition.js', () => ({ registerExtraNodeDefinitions: vi.fn() }));
        const { loadLanguageDefinitionsFromPath } = await import('../language-spec-loader.js');
        const notTauri = await loadLanguageDefinitionsFromPath('/nope.json');
        expect(notTauri).toBe(false);

        vi.resetModules();
        vi.doMock('../language-definition.js', () => ({ registerExtraNodeDefinitions: vi.fn() }));
        vi.doMock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn().mockRejectedValue(new Error('boom')) }), { virtual: true });
        Object.assign(window, { __TAURI_INTERNALS__: {} });
        const mod = await import('../language-spec-loader.js');
        const ok = await mod.loadLanguageDefinitionsFromPath('/bad.json');
        expect(ok).toBe(false);
        delete window.__TAURI_INTERNALS__;
        vi.resetModules();
    });
});
