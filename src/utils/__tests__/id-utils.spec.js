import { describe, expect, it } from 'vitest';
import { getNextNodeId } from '../id-utils.js';

describe('getNextNodeId', () => {
    it('returns incrementing node ids', () => {
        getNextNodeId();
        const second = getNextNodeId();
        const third = getNextNodeId();
        expect(second).toBe('function-2');
        expect(third).toBe('function-3');
    });

    it('continues incrementing after multiple calls', () => {
        getNextNodeId();
        for (let i = 0; i < 10; i++) getNextNodeId();
        expect(getNextNodeId()).toBe('function-15');
    });
});
