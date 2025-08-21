import {describe, expect, it} from 'vitest';
import {
    areTypesCompatible,
    getAllNodeDefinitions,
    getAllTypes,
    getCategoryColor,
    getNodeDefinition,
    getNodesByCategory,
    getTypeColor,
    getTypeInfo,
    NODE_CATEGORIES,
    TYPES
} from '../language-definition.js';

describe('Language Definition - Type System', () => {
    describe('getAllTypes', () => {
        it('should return all types from all categories', () => {
            const allTypes = getAllTypes();

            expect(allTypes).toBeDefined();
            expect(allTypes.int).toBeDefined();
            expect(allTypes.string).toBeDefined();
            expect(allTypes.array).toBeDefined();
            expect(allTypes.exec).toBeDefined();
            expect(allTypes.void).toBeDefined();
        });

        it('should include types from PRIMITIVE, COMPLEX, SPECIAL, and CONTROL', () => {
            const allTypes = getAllTypes();

            // Check each category is represented
            expect(allTypes.int).toEqual(TYPES.PRIMITIVE.int);
            expect(allTypes.array).toEqual(TYPES.COMPLEX.array);
            expect(allTypes.void).toEqual(TYPES.SPECIAL.void);
            expect(allTypes.exec).toEqual(TYPES.CONTROL.exec);
        });
    });

    describe('getTypeInfo', () => {
        it('should return correct type info for valid types', () => {
            const intType = getTypeInfo('int');
            expect(intType).toBeDefined();
            expect(intType.name).toBe('Integer');
            expect(intType.color).toBe('emerald');
            expect(intType.defaultValue).toBe(0);
        });

        it('should return null for invalid types', () => {
            const invalidType = getTypeInfo('nonexistent');
            expect(invalidType).toBeNull();
        });

        it('should return correct info for all type categories', () => {
            expect(getTypeInfo('string').name).toBe('String');
            expect(getTypeInfo('array').name).toBe('Array');
            expect(getTypeInfo('void').name).toBe('Void');
            expect(getTypeInfo('exec').name).toBe('Execution');
        });
    });

    describe('getTypeColor', () => {
        it('should return correct colors for types', () => {
            expect(getTypeColor('int')).toBe('emerald');
            expect(getTypeColor('string')).toBe('pink');
            expect(getTypeColor('bool')).toBe('red');
            expect(getTypeColor('array')).toBe('orange');
        });

        it('should return gray for unknown types', () => {
            expect(getTypeColor('unknown')).toBe('gray');
        });
    });

    describe('areTypesCompatible', () => {
        it('should return true for identical types', () => {
            expect(areTypesCompatible('int', 'int')).toBe(true);
            expect(areTypesCompatible('string', 'string')).toBe(true);
        });

        it('should return true for compatible types', () => {
            expect(areTypesCompatible('int', 'float')).toBe(true);
            expect(areTypesCompatible('int', 'string')).toBe(true);
            expect(areTypesCompatible('float', 'string')).toBe(true);
        });

        it('should return false for incompatible types', () => {
            expect(areTypesCompatible('int', 'array')).toBe(false);
            expect(areTypesCompatible('bool', 'object')).toBe(false);
        });

        it('should return false for unknown types', () => {
            expect(areTypesCompatible('unknown', 'int')).toBe(false);
            expect(areTypesCompatible('int', 'unknown')).toBe(false);
        });

        it('should handle mixed type compatibility', () => {
            expect(areTypesCompatible('mixed', 'int')).toBe(true);
            expect(areTypesCompatible('mixed', 'string')).toBe(true);
            expect(areTypesCompatible('mixed', 'array')).toBe(true);
        });
    });
});

describe('Language Definition - Node Categories', () => {
    describe('NODE_CATEGORIES', () => {
        it('should contain all expected categories', () => {
            const expectedCategories = ['FUNCTION', 'VARIABLE', 'CONTROL', 'MATH', 'STRING', 'ARRAY', 'COMPARISON', 'CAST', 'SYSTEM'];

            expectedCategories.forEach((category) => {
                expect(NODE_CATEGORIES[category]).toBeDefined();
                expect(NODE_CATEGORIES[category].name).toBeDefined();
                expect(NODE_CATEGORIES[category].color).toBeDefined();
                expect(NODE_CATEGORIES[category].description).toBeDefined();
            });
        });

        it('should have colors assigned for each category', () => {
            const categories = Object.values(NODE_CATEGORIES);
            categories.forEach((category) => {
                expect(category.color).toBeDefined();
                expect(typeof category.color).toBe('string');
                expect(category.color.length).toBeGreaterThan(0);
            });
        });
    });

    describe('getCategoryColor', () => {
        it('should return correct colors for valid categories', () => {
            expect(getCategoryColor('FUNCTION')).toBe('blue');
            expect(getCategoryColor('MATH')).toBe('green');
            expect(getCategoryColor('CONTROL')).toBe('yellow');
        });

        it('should return gray for unknown categories', () => {
            expect(getCategoryColor('UNKNOWN')).toBe('gray');
        });

        it('should be case insensitive', () => {
            expect(getCategoryColor('function')).toBe('blue');
            expect(getCategoryColor('FUNCTION')).toBe('blue');
        });
    });
});

describe('Language Definition - Node Definitions', () => {
    describe('getNodesByCategory', () => {
        it('should return nodes for valid categories', () => {
            const mathNodes = getNodesByCategory('MATH');
            expect(mathNodes).toBeDefined();
            expect(mathNodes.add).toBeDefined();
            expect(mathNodes.subtract).toBeDefined();
            expect(mathNodes.multiply).toBeDefined();
        });

        it('should return empty object for invalid categories', () => {
            const invalidNodes = getNodesByCategory('INVALID');
            expect(invalidNodes).toEqual({});
        });

        it('should be case insensitive', () => {
            const mathNodes = getNodesByCategory('math');
            expect(Object.keys(mathNodes).length).toBeGreaterThan(0);

            const mathNodesUpper = getNodesByCategory('MATH');
            expect(mathNodes).toEqual(mathNodesUpper);
        });
    });

    describe('getNodeDefinition', () => {
        it('should return correct node definitions', () => {
            const addNode = getNodeDefinition('add');
            expect(addNode).toBeDefined();
            expect(addNode.name).toBe('Add');
            expect(addNode.category).toBe('MATH');
            expect(addNode.inputs).toHaveLength(2);
            expect(addNode.outputs).toHaveLength(1);
        });

        it('should return null for non-existent nodes', () => {
            const invalidNode = getNodeDefinition('nonexistent');
            expect(invalidNode).toBeNull();
        });

        it('should find nodes across all categories', () => {
            expect(getNodeDefinition('if')).toBeDefined(); // CONTROL
            expect(getNodeDefinition('concat')).toBeDefined(); // STRING
            expect(getNodeDefinition('equals')).toBeDefined(); // COMPARISON
            expect(getNodeDefinition('to_int')).toBeDefined(); // CAST
        });
    });

    describe('getAllNodeDefinitions', () => {
        it('should return all node definitions with metadata', () => {
            const allNodes = getAllNodeDefinitions();

            expect(allNodes).toBeDefined();
            expect(Object.keys(allNodes).length).toBeGreaterThan(30);

            // Check that each node has required properties
            Object.values(allNodes).forEach((node) => {
                expect(node.id).toBeDefined();
                expect(node.name).toBeDefined();
                expect(node.category).toBeDefined();
                expect(node.categoryKey).toBeDefined();
                expect(node.description).toBeDefined();
            });
        });

        it('should include nodes from all categories', () => {
            const allNodes = getAllNodeDefinitions();
            const categories = [...new Set(Object.values(allNodes).map((node) => node.category))];

            expect(categories).toContain('MATH');
            expect(categories).toContain('CONTROL');
            expect(categories).toContain('STRING');
            expect(categories).toContain('ARRAY');
            expect(categories).toContain('COMPARISON');
        });
    });
});

describe('Language Definition - Node Structure Validation', () => {
    it('should have valid input/output structures for all nodes', () => {
        const allNodes = getAllNodeDefinitions();

        Object.entries(allNodes).forEach(([, node]) => {
            // Inputs should be arrays with valid structure
            if (node.inputs) {
                expect(Array.isArray(node.inputs)).toBe(true);
                node.inputs.forEach((input) => {
                    expect(input.name).toBeDefined();
                    expect(input.type).toBeDefined();
                    expect(typeof input.name).toBe('string');
                    expect(typeof input.type).toBe('string');
                });
            }

            // Outputs should be arrays with valid structure
            if (node.outputs) {
                expect(Array.isArray(node.outputs)).toBe(true);
                node.outputs.forEach((output) => {
                    expect(output.name).toBeDefined();
                    expect(output.type).toBeDefined();
                    expect(typeof output.name).toBe('string');
                    expect(typeof output.type).toBe('string');
                });
            }
        });
    });

    it('should have valid type references in node I/O', () => {
        const allNodes = getAllNodeDefinitions();
        const allTypes = getAllTypes();

        Object.entries(allNodes).forEach(([, node]) => {
            // Check input types are valid
            if (node.inputs) {
                node.inputs.forEach((input) => {
                    expect(allTypes[input.type]).toBeDefined();
                });
            }

            // Check output types are valid
            if (node.outputs) {
                node.outputs.forEach((output) => {
                    expect(allTypes[output.type]).toBeDefined();
                });
            }
        });
    });

    it('should have consistent execution flow for appropriate nodes', () => {
        const allNodes = getAllNodeDefinitions();

        // System nodes that perform side effects should have exec pins
        Object.entries(allNodes).forEach(([nodeId, node]) => {
            if (node.category === 'SYSTEM') {
                const hasExecInput = node.inputs?.some((input) => input.type === 'exec');
                const hasExecOutput = node.outputs?.some((output) => output.type === 'exec');

                // Pure read operations like get_env don't need exec pins
                const pureOperations = ['get_env'];
                if (pureOperations.includes(nodeId)) {
                    // These can have exec pins but don't require them
                    return;
                }

                // All other system operations should have exec flow
                expect(hasExecInput || hasExecOutput).toBe(true);
            }
        });

        // Pure math operations should not have exec pins
        const mathNodes = getNodesByCategory('MATH');
        Object.entries(mathNodes).forEach(([, node]) => {
            const hasExecInput = node.inputs?.some((input) => input.type === 'exec');
            const hasExecOutput = node.outputs?.some((output) => output.type === 'exec');
            expect(hasExecInput).toBeFalsy();
            expect(hasExecOutput).toBeFalsy();
        });
    });
});
