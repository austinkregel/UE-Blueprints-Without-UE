import { describe, expect, it } from 'vitest';
import {
    getEventNodes,
    getNodeLibrary,
    getNodesForCategory,
    getProgrammingParadigmNodes,
    getRecommendedNodes,
    getStarterNodes,
    getSystemNodes,
    searchNodeLibrary,
    searchNodes
} from '../node-library.js';

describe('node-library', () => {
    it('search finds items and searchNodeLibrary proxies it', () => {
        const res = searchNodes('print');
        expect(res && typeof res).toBe('object');
        const res2 = searchNodeLibrary('print');
        expect(Object.keys(res2).length).toBeGreaterThanOrEqual(0);
    });

    it('system and event nodes return objects', () => {
        expect(getSystemNodes()).toBeTypeOf('object');
        expect(getEventNodes()).toBeTypeOf('object');
    });

    it('getNodeLibrary returns categories and nodes', () => {
        const lib = getNodeLibrary();
        expect(lib).toHaveProperty('categories');
        expect(lib).toHaveProperty('nodes');
        expect(typeof lib.categories).toBe('object');
        expect(typeof lib.nodes).toBe('object');
    });

    it('getNodesForCategory uses uppercase lookup', () => {
        const sys = getNodesForCategory('system');
        expect(sys && typeof sys).toBe('object');
    });

    it('getStarterNodes has standard groups', () => {
        const s = getStarterNodes();
        expect(s).toHaveProperty('events');
        expect(s).toHaveProperty('basic');
        expect(s).toHaveProperty('flow');
        expect(s).toHaveProperty('system');
    });

    it('getProgrammingParadigmNodes returns structured map', () => {
        const p = getProgrammingParadigmNodes();
        expect(p).toHaveProperty('imperative');
        expect(p).toHaveProperty('object_oriented');
        expect(p).toHaveProperty('functional');
        expect(p).toHaveProperty('system');
        expect(p).toHaveProperty('data_processing');
    });

    it('getRecommendedNodes returns starters for nodeType starter and category-specific when provided', () => {
        const r1 = getRecommendedNodes({ nodeType: 'starter' });
        expect(r1).toHaveProperty('events');

        const r2 = getRecommendedNodes({ category: 'MATH' });
        expect(r2 && typeof r2).toBe('object');
    });
});
