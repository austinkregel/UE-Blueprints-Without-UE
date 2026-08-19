import { describe, expect, it } from 'vitest';
import { rankEntriesByHits } from '../intel.js';

const entries = [
    { id: 'vz/a', file: '/corpus/a.lua' },
    { id: 'vz/b', file: '/corpus/b.lua' },
    { id: 'vz/c', file: '/corpus/c.lua' }
];

describe('rankEntriesByHits', () => {
    it('ranks documents by their best matching function hit', () => {
        const hits = [
            { path: '/corpus/b.lua', score: 0.9 },
            { path: '/corpus/a.lua', score: 0.3 },
            { path: '/corpus/b.lua', score: 0.2 } // b's best is 0.2, beats a
        ];
        const ranked = rankEntriesByHits(entries, hits);
        expect(ranked.map((r) => r.id)).toEqual(['vz/b', 'vz/a']);
        expect(ranked[0].score).toBe(0.2);
    });

    it('drops documents with no hit and entries with no file', () => {
        const ranked = rankEntriesByHits([...entries, { id: 'nofile' }], [{ path: '/corpus/c.lua', score: 0.5 }]);
        expect(ranked.map((r) => r.id)).toEqual(['vz/c']);
    });

    it('is empty when there are no hits', () => {
        expect(rankEntriesByHits(entries, [])).toEqual([]);
    });
});
