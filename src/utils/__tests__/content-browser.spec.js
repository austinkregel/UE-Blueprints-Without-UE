import { afterEach, describe, expect, it } from 'vitest';
import { buildContentTree, contentRevision, getContentEntries, registerContentSource, resolveEntryGraph } from '../content-browser.js';

afterEach(() => registerContentSource(null));

describe('buildContentTree', () => {
    it('folds entries into a folder/file tree by their path', () => {
        const tree = buildContentTree([
            { id: 'a', name: 'A', path: ['vz', 'PMC'] },
            { id: 'b', name: 'B', path: ['vz', 'PMC'] },
            { id: 'c', name: 'C', path: ['resident'] }
        ]);
        expect(tree.folders.map((f) => f.name)).toEqual(['resident', 'vz']); // sorted
        const vz = tree.folders.find((f) => f.name === 'vz');
        expect(vz.folders.map((f) => f.name)).toEqual(['PMC']);
        expect(vz.folders[0].files.map((e) => e.id)).toEqual(['a', 'b']);
    });

    it('propagates a recursive file count up through folders', () => {
        const tree = buildContentTree([
            { id: 'a', path: ['vz', 'PMC'] },
            { id: 'b', path: ['vz', 'Oil'] },
            { id: 'c', path: ['resident'] }
        ]);
        expect(tree.count).toBe(3);
        expect(tree.folders.find((f) => f.name === 'vz').count).toBe(2);
    });

    it('sorts folders and files by name', () => {
        const tree = buildContentTree([
            { id: '2', name: 'Zeta', path: ['g'] },
            { id: '1', name: 'Alpha', path: ['g'] }
        ]);
        expect(tree.folders[0].files.map((e) => e.name)).toEqual(['Alpha', 'Zeta']);
    });

    it('places entries with no path (or empty segments) at the root', () => {
        const tree = buildContentTree([
            { id: 'a', name: 'A' },
            { id: 'b', name: 'B', path: [] },
            { id: 'c', name: 'C', path: ['', null] }
        ]);
        expect(tree.files.map((e) => e.id).sort()).toEqual(['a', 'b', 'c']);
        expect(tree.folders).toEqual([]);
    });

    it('is robust with no entries', () => {
        const tree = buildContentTree([]);
        expect(tree.count).toBe(0);
        expect(tree.folders).toEqual([]);
        expect(tree.files).toEqual([]);
    });
});

describe('getContentEntries', () => {
    it('returns [] when no source is registered', () => {
        expect(getContentEntries()).toEqual([]);
    });

    it('accepts a source returning an array or an { entries } object', () => {
        registerContentSource(() => [{ id: 'a' }]);
        expect(getContentEntries()).toHaveLength(1);
        registerContentSource(() => ({ entries: [{ id: 'a' }, { id: 'b' }] }));
        expect(getContentEntries()).toHaveLength(2);
    });

    it('drops entries without an id and survives a throwing source', () => {
        registerContentSource(() => [{ id: 'a' }, { name: 'no id' }, null]);
        expect(getContentEntries().map((e) => e.id)).toEqual(['a']);
        registerContentSource(() => {
            throw new Error('boom');
        });
        expect(getContentEntries()).toEqual([]);
    });

    it('bumps contentRevision on register so consumers recompute', () => {
        const before = contentRevision.value;
        registerContentSource(() => []);
        expect(contentRevision.value).toBe(before + 1);
    });
});

describe('resolveEntryGraph', () => {
    it('hydrates from open() and normalizes missing arrays', () => {
        const g = resolveEntryGraph({ id: 'a', name: 'A', open: () => ({ nodes: [{ id: 1 }] }) });
        expect(g.nodes).toHaveLength(1);
        expect(g.connections).toEqual([]);
        expect(g.name).toBe('A');
    });

    it('hydrates from an inline graph and prefers the graph name', () => {
        const g = resolveEntryGraph({ id: 'a', name: 'A', graph: { name: 'Doc', nodes: [], connections: [] } });
        expect(g.name).toBe('Doc');
    });

    it('returns null for an entry with nothing openable, or a throwing open()', () => {
        expect(resolveEntryGraph({ id: 'a' })).toBeNull();
        expect(resolveEntryGraph(null)).toBeNull();
        expect(
            resolveEntryGraph({
                id: 'a',
                open: () => {
                    throw new Error('boom');
                }
            })
        ).toBeNull();
    });
});
