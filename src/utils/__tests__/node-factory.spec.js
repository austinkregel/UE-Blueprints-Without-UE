import {beforeEach, describe, expect, it, vi} from 'vitest';
import {
    createCastNode,
    createFunctionNode,
    createNodeFromDefinition,
    createVariableNode,
    getNodePalette,
    validateNode
} from '../node-factory.js';
import {getAllNodeDefinitions, getCategoryColor, getNodeDefinition} from '../language-definition.js';
import {getNextNodeId} from '../id-utils.js';

// Mock the dependencies
vi.mock('../language-definition.js', () => ({
    getNodeDefinition: vi.fn(),
    getCategoryColor: vi.fn(),
    getAllNodeDefinitions: vi.fn()
}));

vi.mock('../id-utils.js', () => ({
    getNextNodeId: vi.fn()
}));

describe('Node Factory', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getNextNodeId.mockReturnValue('test-id-123');
    });

    describe('createNodeFromDefinition', () => {
        it('should create a node from a valid definition', () => {
            const mockNodeDef = {
                name: 'Add',
                category: 'MATH',
                inputs: [
                    {name: 'a', type: 'float'},
                    {name: 'b', type: 'float'}
                ],
                outputs: [{name: 'result', type: 'float'}],
                description: 'Add two numbers'
            };

            getNodeDefinition.mockReturnValue(mockNodeDef);

            const result = createNodeFromDefinition('add', 150, 200);

            expect(result).toEqual({
                id: 'test-id-123',
                type: 'math',
                nodeDefId: 'add',
                name: 'Add',
                x: 150,
                y: 200,
                inputs: [
                    {name: 'a', type: 'float'},
                    {name: 'b', type: 'float'}
                ],
                outputs: [{name: 'result', type: 'float'}],
                description: 'Add two numbers',
                category: 'MATH'
            });

            expect(getNodeDefinition).toHaveBeenCalledWith('add');
            expect(getNextNodeId).toHaveBeenCalledWith('add');
        });

        it('should return null for invalid definition', () => {
            getNodeDefinition.mockReturnValue(null);

            const result = createNodeFromDefinition('invalid');

            expect(result).toBeNull();
            expect(getNodeDefinition).toHaveBeenCalledWith('invalid');
        });

        it('should apply overrides correctly', () => {
            const mockNodeDef = {
                name: 'Test Node',
                category: 'TEST',
                inputs: [],
                outputs: [],
                description: 'Test description'
            };

            getNodeDefinition.mockReturnValue(mockNodeDef);

            const overrides = {
                customProperty: 'custom value',
                name: 'Overridden Name'
            };

            const result = createNodeFromDefinition('test', 100, 100, overrides);

            expect(result.customProperty).toBe('custom value');
            expect(result.name).toBe('Overridden Name');
        });

        it('should use default position when not specified', () => {
            const mockNodeDef = {
                name: 'Test',
                category: 'TEST',
                inputs: [],
                outputs: [],
                description: 'Test'
            };

            getNodeDefinition.mockReturnValue(mockNodeDef);

            const result = createNodeFromDefinition('test');

            expect(result.x).toBe(100);
            expect(result.y).toBe(100);
        });

        it('should deep copy inputs and outputs', () => {
            const mockNodeDef = {
                name: 'Test',
                category: 'TEST',
                inputs: [{name: 'input1', type: 'int'}],
                outputs: [{name: 'output1', type: 'string'}],
                description: 'Test'
            };

            getNodeDefinition.mockReturnValue(mockNodeDef);

            const result = createNodeFromDefinition('test');

            // Modify the result's inputs/outputs
            result.inputs.push({name: 'new_input', type: 'float'});
            result.outputs[0].name = 'modified_name';

            // Original should be unchanged
            expect(mockNodeDef.inputs).toHaveLength(1);
            expect(mockNodeDef.outputs[0].name).toBe('output1');
        });
    });

    describe('createVariableNode', () => {
        it('should create a variable getter node', () => {
            const result = createVariableNode('counter', 'int', 'get', 150, 200);

            expect(result).toEqual({
                id: 'test-id-123',
                type: 'variable',
                varName: 'counter',
                varType: 'int',
                varAction: 'get',
                x: 150,
                y: 200,
                inputs: [],
                outputs: [{name: 'value', type: 'int'}],
                category: 'VARIABLE'
            });

            expect(getNextNodeId).toHaveBeenCalledWith('variable');
        });

        it('should create a variable setter node', () => {
            const result = createVariableNode('counter', 'int', 'set', 150, 200);

            expect(result).toEqual({
                id: 'test-id-123',
                type: 'variable',
                varName: 'counter',
                varType: 'int',
                varAction: 'set',
                x: 150,
                y: 200,
                inputs: [{name: 'value', type: 'int'}],
                outputs: [],
                category: 'VARIABLE'
            });
        });

        it('should default to getter action', () => {
            const result = createVariableNode('test', 'string');

            expect(result.varAction).toBe('get');
            expect(result.inputs).toEqual([]);
            expect(result.outputs).toEqual([{name: 'value', type: 'string'}]);
        });

        it('should use default position', () => {
            const result = createVariableNode('test', 'bool');

            expect(result.x).toBe(100);
            expect(result.y).toBe(100);
        });
    });

    describe('createFunctionNode', () => {
        it('should create a function node with inputs and outputs', () => {
            const inputs = [
                {name: 'param1', type: 'int'},
                {name: 'param2', type: 'string'}
            ];
            const outputs = [{name: 'result', type: 'bool'}];

            const result = createFunctionNode('myFunction', inputs, outputs, 200, 300);

            expect(result).toEqual({
                id: 'test-id-123',
                type: 'function',
                funcName: 'myFunction',
                x: 200,
                y: 300,
                inputs: [
                    {name: 'param1', type: 'int'},
                    {name: 'param2', type: 'string'}
                ],
                outputs: [{name: 'result', type: 'bool'}],
                category: 'FUNCTION'
            });

            expect(getNextNodeId).toHaveBeenCalledWith('function');
        });

        it('should create function with empty inputs/outputs', () => {
            const result = createFunctionNode('emptyFunction');

            expect(result.inputs).toEqual([]);
            expect(result.outputs).toEqual([]);
        });

        it('should use default position', () => {
            const result = createFunctionNode('test');

            expect(result.x).toBe(100);
            expect(result.y).toBe(100);
        });

        it('should deep copy input arrays', () => {
            const inputs = [{name: 'param', type: 'int'}];
            const outputs = [{name: 'result', type: 'string'}];

            const result = createFunctionNode('test', inputs, outputs);

            // Modify the result's arrays
            result.inputs.push({name: 'new_param', type: 'float'});
            result.outputs[0].name = 'modified_result';

            // Originals should be unchanged
            expect(inputs).toHaveLength(1);
            expect(outputs[0].name).toBe('result');
        });
    });

    describe('createCastNode', () => {
        it('should create a cast node', () => {
            const result = createCastNode('int', 'string', 250, 350);

            expect(result).toEqual({
                id: 'test-id-123',
                type: 'cast',
                fromType: 'int',
                toType: 'string',
                x: 250,
                y: 350,
                inputs: [{name: 'in', type: 'int'}],
                outputs: [{name: 'out', type: 'string'}],
                category: 'CAST'
            });

            expect(getNextNodeId).toHaveBeenCalledWith('cast');
        });

        it('should use default position', () => {
            const result = createCastNode('float', 'int');

            expect(result.x).toBe(100);
            expect(result.y).toBe(100);
        });
    });

    describe('getNodePalette', () => {
        it('should organize nodes by category', () => {
            const mockNodes = {
                add: {
                    name: 'Add',
                    category: 'MATH',
                    description: 'Add two numbers',
                    inputs: [{name: 'a', type: 'float'}],
                    outputs: [{name: 'result', type: 'float'}]
                },
                subtract: {
                    name: 'Subtract',
                    category: 'MATH',
                    description: 'Subtract numbers',
                    inputs: [{name: 'a', type: 'float'}],
                    outputs: [{name: 'result', type: 'float'}]
                },
                if: {
                    name: 'If Statement',
                    category: 'CONTROL',
                    description: 'Conditional execution',
                    inputs: [{name: 'condition', type: 'bool'}],
                    outputs: []
                }
            };

            getAllNodeDefinitions.mockReturnValue(mockNodes);
            getCategoryColor.mockImplementation((category) => {
                const colors = {MATH: 'green', CONTROL: 'yellow'};
                return colors[category] || 'gray';
            });

            const result = getNodePalette();

            expect(result).toEqual({
                MATH: {
                    name: 'MATH',
                    color: 'green',
                    nodes: [
                        {
                            id: 'add',
                            name: 'Add',
                            description: 'Add two numbers',
                            inputs: [{name: 'a', type: 'float'}],
                            outputs: [{name: 'result', type: 'float'}]
                        },
                        {
                            id: 'subtract',
                            name: 'Subtract',
                            description: 'Subtract numbers',
                            inputs: [{name: 'a', type: 'float'}],
                            outputs: [{name: 'result', type: 'float'}]
                        }
                    ]
                },
                CONTROL: {
                    name: 'CONTROL',
                    color: 'yellow',
                    nodes: [
                        {
                            id: 'if',
                            name: 'If Statement',
                            description: 'Conditional execution',
                            inputs: [{name: 'condition', type: 'bool'}],
                            outputs: []
                        }
                    ]
                }
            });

            expect(getAllNodeDefinitions).toHaveBeenCalled();
            expect(getCategoryColor).toHaveBeenCalledWith('MATH');
            expect(getCategoryColor).toHaveBeenCalledWith('CONTROL');
        });

        it('should handle empty node definitions', () => {
            getAllNodeDefinitions.mockReturnValue({});

            const result = getNodePalette();

            expect(result).toEqual({});
        });
    });

    describe('validateNode', () => {
        it('should validate a valid node', () => {
            const validNode = {
                id: 'test-123',
                type: 'function',
                x: 100,
                y: 200,
                inputs: [],
                outputs: []
            };

            const result = validateNode(validNode);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toHaveLength(0);
        });

        it('should detect missing required properties', () => {
            const invalidNode = {
                type: 'function',
                x: 100
                // Missing id and y
            };

            const result = validateNode(invalidNode);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Missing required property: id');
            expect(result.errors).toContain('Missing required property: y');
        });

        it('should validate against node definition when nodeDefId exists', () => {
            const mockNodeDef = {
                inputs: [{name: 'a', type: 'int'}],
                outputs: [{name: 'result', type: 'int'}]
            };

            getNodeDefinition.mockReturnValue(mockNodeDef);

            const nodeWithDef = {
                id: 'test-123',
                type: 'function',
                x: 100,
                y: 200,
                nodeDefId: 'add',
                inputs: [{name: 'a', type: 'int'}],
                outputs: [{name: 'result', type: 'int'}]
            };

            const result = validateNode(nodeWithDef);

            expect(result.isValid).toBe(true);
            expect(result.warnings).toHaveLength(0);
            expect(getNodeDefinition).toHaveBeenCalledWith('add');
        });

        it('should warn about definition mismatches', () => {
            const mockNodeDef = {
                inputs: [{name: 'a', type: 'int'}],
                outputs: [{name: 'result', type: 'int'}]
            };

            getNodeDefinition.mockReturnValue(mockNodeDef);

            const nodeWithDifferentIO = {
                id: 'test-123',
                type: 'function',
                x: 100,
                y: 200,
                nodeDefId: 'add',
                inputs: [{name: 'b', type: 'float'}], // Different from definition
                outputs: [{name: 'result', type: 'int'}]
            };

            const result = validateNode(nodeWithDifferentIO);

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('Node inputs differ from definition');
        });

        it('should handle missing node definition', () => {
            getNodeDefinition.mockReturnValue(null);

            const nodeWithInvalidDef = {
                id: 'test-123',
                type: 'function',
                x: 100,
                y: 200,
                nodeDefId: 'nonexistent'
            };

            const result = validateNode(nodeWithInvalidDef);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Node definition not found: nonexistent');
        });
    });
});
