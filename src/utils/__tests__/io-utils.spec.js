import {beforeEach, describe, expect, it} from 'vitest';
import {
    getConnectionPointsArray,
    getRectXBasedOnType,
    getRectYBasedOnType,
    registerIO,
    renderConnectionPath
} from '../io-utils.js';
import {ioPositions} from '../state.js';

describe('registerIO', () => {
    beforeEach(() => {
        ioPositions.value = {};
    });

    it('registers input position', () => {
        registerIO({nodeId: 1, type: 'input', name: 'a', x: 10, y: 20});
        expect(ioPositions.value[1].inputs.a).toEqual({x: 10, y: 20});
    });

    it('registers output position', () => {
        registerIO({nodeId: 2, type: 'output', name: 'result', x: 30, y: 40});
        expect(ioPositions.value[2].outputs.result).toEqual({x: 30, y: 40});
    });
});

describe('getConnectionPointsArray', () => {
    beforeEach(() => {
        ioPositions.value = {
            1: {outputs: {a: {x: 10, y: 20}}, inputs: {}},
            2: {inputs: {b: {x: 30, y: 40}}, outputs: {}}
        };
    });

    it('returns array of connection points', () => {
        const conn = {from: {nodeId: 1, output: 'a'}, to: {nodeId: 2, input: 'b'}};
        expect(getConnectionPointsArray(conn)).toEqual([
            {x: 10, y: 20},
            {x: 30, y: 40}
        ]);
    });

    it('returns null if from or to is missing', () => {
        const conn = {from: {nodeId: 1, output: 'missing'}, to: {nodeId: 2, input: 'b'}};
        expect(getConnectionPointsArray(conn)).toBeNull();
    });
});

describe('renderConnectionPath', () => {
    it('returns empty string for invalid points', () => {
        expect(renderConnectionPath(null)).toBe('');
        expect(renderConnectionPath([])).toBe('');
        expect(renderConnectionPath([{x: 1, y: 2}])).toBe('');
    });

    it('returns SVG path for two valid points (default offset)', () => {
        const points = [
            {x: 10, y: 20},
            {x: 110, y: 120}
        ];
        const path = renderConnectionPath(points);
        expect(path).toMatch(/^M5,25 C[\d.]+,[\d.]+ [\d.]+,[\d.]+ 115,125$/);
        expect(path.includes('C')).toBe(true);
    });

    it('returns SVG path for two valid points (offset=false)', () => {
        const points = [
            {x: 15, y: 25},
            {x: 115, y: 125}
        ];
        const path = renderConnectionPath(points, {offset: false});
        expect(path).toMatch(/^M10,30 C[\d.]+,[\d.]+ [\d.]+,[\d.]+ 120,130$/);
        expect(path.includes('C')).toBe(true);
    });
});

describe('getRectXBasedOnType', () => {
    it('returns correct x for input', () => {
        const rect = {left: 50, width: 100};
        global.window = Object.assign(global.window || {}, {scrollX: 0});
        expect(getRectXBasedOnType('input', rect)).toBe(60);
    });
    it('returns correct x for output', () => {
        const rect = {left: 50, width: 100};
        global.window = Object.assign(global.window || {}, {scrollX: 0});
        expect(getRectXBasedOnType('output', rect)).toBe(140);
    });
});

describe('getRectYBasedOnType', () => {
    it('returns correct y', () => {
        const rect = {top: 20};
        global.window = Object.assign(global.window || {}, {scrollY: 0});
        expect(getRectYBasedOnType('input', rect)).toBe(30);
        expect(getRectYBasedOnType('output', rect)).toBe(30);
    });
});

describe('io utils', () => {
    it('dummy', () => {
        expect(true).toBe(true);
    });
});
