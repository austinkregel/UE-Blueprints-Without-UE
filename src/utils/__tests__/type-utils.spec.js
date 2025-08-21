import {describe, expect, it} from 'vitest';
import {canCast, isExecIO, isSameType} from '../type-utils.js';

describe('type-utils', () => {
    it('detects exec IO', () => {
        expect(isExecIO({name: 'Exec', type: 'exec'})).toBe(true);
        expect(isExecIO({name: 'Then', type: 'exec'})).toBe(true);
        expect(isExecIO({name: 'value', type: 'string'})).toBe(false);
    });

    it('isSameType is case-insensitive', () => {
        expect(isSameType('Int', 'int')).toBe(true);
        expect(isSameType('FLOAT', 'float')).toBe(true);
        expect(isSameType('int', 'float')).toBe(false);
    });

    it('canCast respects compatibility and special cases', () => {
        // From language-definition: int <-> float and with string
        expect(canCast('int', 'float')).toBe(true);
        expect(canCast('float', 'int')).toBe(true);
        expect(canCast('int', 'string')).toBe(true);
        expect(canCast('string', 'int')).toBe(true);

        // mixed and null
        expect(canCast('mixed', 'string')).toBe(true);
        expect(canCast('null', 'int')).toBe(true);

        // exec never casts
        expect(canCast('exec', 'int')).toBe(false);
        expect(canCast('int', 'exec')).toBe(false);
    });
});
