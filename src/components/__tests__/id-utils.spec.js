import { describe, it, expect } from 'vitest';
import { getNextNodeId } from '../id-utils.js';

describe('getNextNodeId', () => {
  it('returns incrementing node ids', () => {
    const first = getNextNodeId();
    const second = getNextNodeId();
    const third = getNextNodeId();
    expect(second).toBe(first + 1);
    expect(third).toBe(second + 1);
  });

  it('continues incrementing after multiple calls', () => {
    let last = getNextNodeId();
    for (let i = 0; i < 10; i++) last = getNextNodeId();
    expect(getNextNodeId()).toBe(last + 1);
  });
});
