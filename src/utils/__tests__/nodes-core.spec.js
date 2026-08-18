import { describe, expect, it } from 'vitest';
import { cloneNode } from '../nodes-core.js';

describe('cloneNode', () => {
    it('deep-clones with a new id and offset, independent of the original', () => {
        const node = { id: 'a', x: 100, y: 50, inputs: [{ name: 'in', defaultValue: 1 }] };
        const clone = cloneNode(node, 'b', 40, 40);
        expect(clone.id).toBe('b');
        expect(clone.x).toBe(140);
        expect(clone.y).toBe(90);
        // deep copy: mutating the clone leaves the original untouched
        expect(clone.inputs).not.toBe(node.inputs);
        clone.inputs[0].defaultValue = 99;
        expect(node.inputs[0].defaultValue).toBe(1);
    });

    it('defaults missing x/y to 0 before offsetting', () => {
        const clone = cloneNode({ id: 'a' }, 'b', 10, 20);
        expect(clone.x).toBe(10);
        expect(clone.y).toBe(20);
    });
});
