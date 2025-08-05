import { ioPositions, getIOPosition } from '../base-node-utils.js';
import { describe, it, beforeEach, expect } from 'vitest';

describe('getIOPosition', () => {
  beforeEach(() => {
    ioPositions.value = {
      1: {
        inputs: { a: { x: 10, y: 20 }, b: { x: 30, y: 40 } },
        outputs: { result: { x: 50, y: 60 } }
      },
      2: {
        inputs: {},
        outputs: { value: { x: 70, y: 80 } }
      }
    };
  });

  it('returns correct position for valid input', () => {
    expect(getIOPosition(1, 'input', 'a')).toEqual({ x: 10, y: 20 });
    expect(getIOPosition(1, 'input', 'b')).toEqual({ x: 30, y: 40 });
  });

  it('returns correct position for valid output', () => {
    expect(getIOPosition(1, 'output', 'result')).toEqual({ x: 50, y: 60 });
    expect(getIOPosition(2, 'output', 'value')).toEqual({ x: 70, y: 80 });
  });

  it('returns null for invalid nodeId', () => {
    expect(getIOPosition(999, 'input', 'a')).toBeNull();
  });

  it('returns null for invalid ioType', () => {
    expect(getIOPosition(1, 'invalidType', 'a')).toBeNull();
  });

  it('returns null for invalid ioName', () => {
    expect(getIOPosition(1, 'input', 'notExist')).toBeNull();
    expect(getIOPosition(1, 'output', 'notExist')).toBeNull();
  });
});

