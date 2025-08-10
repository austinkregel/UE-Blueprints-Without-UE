import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getNodeColor,
  getAvailableColors,
  getCategoryColorByName
} from '../node-colors.js';

// Mock the language definition module
vi.mock('../language-definition.js', () => ({
  getCategoryColor: vi.fn(),
  getNodeDefinition: vi.fn()
}));

import { getCategoryColor, getNodeDefinition } from '../language-definition.js';

describe('Node Colors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNodeColor', () => {
    it('should return color based on node definition when nodeId provided', () => {
      const mockNodeDef = {
        category: 'MATH'
      };

      getNodeDefinition.mockReturnValue(mockNodeDef);
      getCategoryColor.mockReturnValue('green');

      const result = getNodeColor('function', 'add');

      expect(result).toBe('green');
      expect(getNodeDefinition).toHaveBeenCalledWith('add');
      expect(getCategoryColor).toHaveBeenCalledWith('MATH');
    });

    it('should fallback to type-based mapping when no nodeId', () => {
      const result = getNodeColor('function');
      expect(result).toBe('blue');
    });

    it('should fallback to type-based mapping when nodeId has no definition', () => {
      getNodeDefinition.mockReturnValue(null);

      const result = getNodeColor('variable', 'nonexistent');

      expect(result).toBe('purple');
      expect(getNodeDefinition).toHaveBeenCalledWith('nonexistent');
    });

    it('should return correct colors for all node types', () => {
      expect(getNodeColor('function')).toBe('blue');
      expect(getNodeColor('variable')).toBe('purple');
      expect(getNodeColor('system')).toBe('gray');
      expect(getNodeColor('control')).toBe('yellow');
      expect(getNodeColor('math')).toBe('green');
      expect(getNodeColor('string')).toBe('pink');
      expect(getNodeColor('array')).toBe('orange');
      expect(getNodeColor('comparison')).toBe('green');
      expect(getNodeColor('cast')).toBe('cyan');
    });

    it('should return default color for unknown types', () => {
      expect(getNodeColor('unknown')).toBe('blue');
      expect(getNodeColor('')).toBe('blue');
      expect(getNodeColor(null)).toBe('blue');
    });

    it('should handle nodeId without definition gracefully', () => {
      getNodeDefinition.mockReturnValue(null);

      const result = getNodeColor('math', 'invalid_node');

      expect(result).toBe('green');
      expect(getNodeDefinition).toHaveBeenCalledWith('invalid_node');
    });

    it('should prioritize definition-based color over type-based', () => {
      const mockNodeDef = {
        category: 'SYSTEM'
      };

      getNodeDefinition.mockReturnValue(mockNodeDef);
      getCategoryColor.mockReturnValue('gray');

      // Even though type is 'function' (which would be blue), 
      // it should use the definition category color
      const result = getNodeColor('function', 'print');

      expect(result).toBe('gray');
    });

    it('should handle node definition without category', () => {
      const mockNodeDef = {
        name: 'Test Node'
        // Missing category
      };

      getNodeDefinition.mockReturnValue(mockNodeDef);
      getCategoryColor.mockReturnValue('gray');

      const result = getNodeColor('function', 'test');

      expect(result).toBe('blue'); // Should fallback to type-based
    });
  });

  describe('getAvailableColors', () => {
    it('should return array of available colors', () => {
      const colors = getAvailableColors();

      expect(Array.isArray(colors)).toBe(true);
      expect(colors).toContain('blue');
      expect(colors).toContain('green');
      expect(colors).toContain('yellow');
      expect(colors).toContain('purple');
      expect(colors).toContain('red');
      expect(colors).toContain('cyan');
      expect(colors).toContain('pink');
      expect(colors).toContain('orange');
      expect(colors).toContain('gray');
    });

    it('should return consistent results', () => {
      const colors1 = getAvailableColors();
      const colors2 = getAvailableColors();

      expect(colors1).toEqual(colors2);
    });

    it('should return unique colors', () => {
      const colors = getAvailableColors();
      const uniqueColors = [...new Set(colors)];

      expect(colors.length).toBe(uniqueColors.length);
    });
  });

  describe('getCategoryColorByName', () => {
    it('should delegate to getCategoryColor from language definition', () => {
      getCategoryColor.mockReturnValue('blue');

      const result = getCategoryColorByName('FUNCTION');

      expect(result).toBe('blue');
      expect(getCategoryColor).toHaveBeenCalledWith('FUNCTION');
    });

    it('should pass through all parameters', () => {
      getCategoryColor.mockReturnValue('green');

      getCategoryColorByName('MATH');

      expect(getCategoryColor).toHaveBeenCalledWith('MATH');
    });

    it('should handle undefined category', () => {
      getCategoryColor.mockReturnValue('gray');

      const result = getCategoryColorByName(undefined);

      expect(result).toBe('gray');
      expect(getCategoryColor).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Color mapping consistency', () => {
    it('should have consistent type to color mapping', () => {
      const typeColorMap = {
        'function': 'blue',
        'variable': 'purple',
        'system': 'gray',
        'control': 'yellow',
        'math': 'green',
        'string': 'pink',
        'array': 'orange',
        'comparison': 'green',
        'cast': 'cyan'
      };

      Object.entries(typeColorMap).forEach(([type, expectedColor]) => {
        expect(getNodeColor(type)).toBe(expectedColor);
      });
    });

    it('should include all mapped colors in available colors', () => {
      const availableColors = getAvailableColors();
      const mappedColors = ['blue', 'purple', 'gray', 'yellow', 'green', 'pink', 'orange', 'red', 'cyan'];

      mappedColors.forEach(color => {
        expect(availableColors).toContain(color);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle null and undefined nodeType', () => {
      expect(getNodeColor(null)).toBe('blue');
      expect(getNodeColor(undefined)).toBe('blue');
    });

    it('should handle empty string nodeType', () => {
      expect(getNodeColor('')).toBe('blue');
    });

    it('should handle numeric nodeType', () => {
      expect(getNodeColor(123)).toBe('blue');
    });

    it('should handle object nodeType', () => {
      expect(getNodeColor({})).toBe('blue');
    });

    it('should be case sensitive for nodeType', () => {
      expect(getNodeColor('FUNCTION')).toBe('blue'); // Not found, uses default
      expect(getNodeColor('function')).toBe('blue'); // Found
    });
  });
});
