/**
 * PHP Language Definition for Node-Based Programming
 * 
 * This file defines all available types, nodes, functions, and system operations
 * that can be used in the visual programming interface.
 */

// ===== TYPE SYSTEM =====
export const TYPES = {
  // Primitive types
  PRIMITIVE: {
    'int': {
      name: 'Integer',
      color: 'emerald',
      compatible: ['float', 'string', 'bool'],
      defaultValue: 0,
      validation: (value) => Number.isInteger(Number(value))
    },
    'float': {
      name: 'Float',
      color: 'emerald', 
      compatible: ['int', 'string'],
      defaultValue: 0.0,
      validation: (value) => !isNaN(parseFloat(value))
    },
    'string': {
      name: 'String',
      color: 'pink',
      compatible: ['int', 'float', 'bool'],
      defaultValue: '',
      validation: () => true
    },
    'bool': {
      name: 'Boolean',
      color: 'red',
      compatible: ['int', 'string'],
      defaultValue: false,
      validation: (value) => typeof value === 'boolean' || value === 'true' || value === 'false'
    }
  },
  
  // Complex types
  COMPLEX: {
    'array': {
      name: 'Array',
      color: 'orange',
      compatible: ['object', 'string'],
      defaultValue: [],
      validation: (value) => Array.isArray(value)
    },
    'object': {
      name: 'Object',
      color: 'violet',
      compatible: ['array', 'string'],
      defaultValue: {},
      validation: (value) => typeof value === 'object' && value !== null
    },
    'callable': {
      name: 'Callable',
      color: 'indigo',
      compatible: ['string'],
      defaultValue: null,
      validation: (value) => typeof value === 'function'
    }
  },
  
  // Special types
  SPECIAL: {
    'void': {
      name: 'Void',
      color: 'gray',
      compatible: [],
      defaultValue: null,
      validation: () => true
    },
    'mixed': {
      name: 'Mixed',
      color: 'slate',
      compatible: ['int', 'float', 'string', 'bool', 'array', 'object'],
      defaultValue: null,
      validation: () => true
    },
    'null': {
      name: 'Null',
      color: 'zinc',
      compatible: ['mixed'],
      defaultValue: null,
      validation: (value) => value === null || value === undefined
    },
    'resource': {
      name: 'Resource',
      color: 'amber',
      compatible: [],
      defaultValue: null,
      validation: () => true
    }
  },
  
  // Control flow types
  CONTROL: {
    'exec': {
      name: 'Execution',
      color: 'white',
      compatible: [],
      defaultValue: null,
      validation: () => true
    }
  }
};

// ===== NODE CATEGORIES =====
export const NODE_CATEGORIES = {
  FUNCTION: {
    name: 'Functions',
    color: 'blue',
    icon: 'function',
    description: 'User-defined and built-in functions'
  },
  VARIABLE: {
    name: 'Variables',
    color: 'purple',
    icon: 'variable',
    description: 'Variable operations (get/set)'
  },
  CONTROL: {
    name: 'Control Flow',
    color: 'yellow',
    icon: 'flow',
    description: 'Conditional statements, loops, and flow control'
  },
  MATH: {
    name: 'Math',
    color: 'green',
    icon: 'calculate',
    description: 'Mathematical operations and functions'
  },
  STRING: {
    name: 'String',
    color: 'pink',
    icon: 'text',
    description: 'String manipulation and operations'
  },
  ARRAY: {
    name: 'Array',
    color: 'orange',
    icon: 'list',
    description: 'Array and collection operations'
  },
  COMPARISON: {
    name: 'Comparison',
    color: 'red',
    icon: 'compare',
    description: 'Comparison and logical operations'
  },
  CAST: {
    name: 'Type Cast',
    color: 'cyan',
    icon: 'convert',
    description: 'Type conversion operations'
  },
  BITWISE: {
    name: 'Bitwise',
    color: 'purple',
    icon: 'bits',
    description: 'Bitwise operations and bit manipulation'
  },
  EXCEPTION: {
    name: 'Exception',
    color: 'red',
    icon: 'warning',
    description: 'Exception handling and error management'
  },
  MEMORY: {
    name: 'Memory',
    color: 'slate',
    icon: 'memory',
    description: 'Memory management and reference operations'
  },
  ADVANCED_MATH: {
    name: 'Advanced Math',
    color: 'emerald',
    icon: 'formula',
    description: 'Advanced mathematical functions and operations'
  },
  ADVANCED_STRING: {
    name: 'Advanced String',
    color: 'pink',
    icon: 'text-advanced',
    description: 'Advanced string manipulation and pattern matching'
  },
  ADVANCED_ARRAY: {
    name: 'Advanced Array',
    color: 'orange',
    icon: 'list-advanced',
    description: 'Advanced array operations and functional programming'
  },
  OBJECT: {
    name: 'Object',
    color: 'violet',
    icon: 'object',
    description: 'Object and dictionary operations'
  },
  FUNCTIONAL: {
    name: 'Functional',
    color: 'indigo',
    icon: 'lambda',
    description: 'Function definition and functional programming'
  },
  IO: {
    name: 'Input/Output',
    color: 'blue',
    icon: 'io',
    description: 'File and input/output operations'
  },
  TIME: {
    name: 'Time',
    color: 'amber',
    icon: 'clock',
    description: 'Time, date, and timing operations'
  },
  NETWORK: {
    name: 'Network',
    color: 'cyan',
    icon: 'network',
    description: 'Network requests and data serialization'
  },
  SYSTEM: {
    name: 'System',
    color: 'gray',
    icon: 'system',
    description: 'System operations and utilities'
  },
  CONSTANT: {
    name: 'Constants',
    color: 'slate',
    icon: 'constant',
    description: 'Literal values (string, number, boolean)'
  },
  LARAVEL: {
    name: 'Laravel',
    color: 'indigo',
    icon: 'laravel',
    description: 'Laravel framework primitives: routing, models, auth, cache, events, jobs, views, responses'
  }
};

// ===== NODE DEFINITIONS =====
export const NODE_DEFINITIONS = {
  // ===== CONTROL FLOW NODES =====
  CONTROL: {
    'if': {
      name: 'If Statement',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'condition', type: 'bool' }
      ],
      outputs: [
        { name: 'True', type: 'exec' },
        { name: 'False', type: 'exec' }
      ],
      description: 'Conditional execution based on boolean condition'
    },
    'for': {
      name: 'For Loop',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'start', type: 'int' },
        { name: 'end', type: 'int' },
        { name: 'step', type: 'int', defaultValue: 1 }
      ],
      outputs: [
        { name: 'Loop Body', type: 'exec' },
        { name: 'index', type: 'int' },
        { name: 'Completed', type: 'exec' }
      ],
      description: 'For loop with start, end, and step values'
    },
    'while': {
      name: 'While Loop',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'condition', type: 'bool' }
      ],
      outputs: [
        { name: 'Loop Body', type: 'exec' },
        { name: 'Completed', type: 'exec' }
      ],
      description: 'While loop with condition'
    },
    'foreach': {
      name: 'Foreach Loop',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'array', type: 'array' }
      ],
      outputs: [
        { name: 'Loop Body', type: 'exec' },
        { name: 'key', type: 'mixed' },
        { name: 'value', type: 'mixed' },
        { name: 'Completed', type: 'exec' }
      ],
      description: 'Foreach loop over array elements'
    },
    'switch': {
      name: 'Switch Statement',
      category: 'CONTROL',
      inputs: [
        { name: 'value', type: 'mixed' }
      ],
      outputs: [],
      description: 'Switch statement for multiple conditions',
      dynamicOutputs: true
    },
    
    // ===== EXECUTION FLOW CONTROL NODES =====
    'sequence': {
      name: 'Sequence',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' }
      ],
      outputs: [
        { name: 'Then 0', type: 'exec' },
        { name: 'Then 1', type: 'exec' },
        { name: 'Then 2', type: 'exec' }
      ],
      description: 'Execute multiple outputs in sequence',
      dynamicOutputs: true
    },
    'branch': {
      name: 'Branch',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'condition', type: 'bool' }
      ],
      outputs: [
        { name: 'True', type: 'exec' },
        { name: 'False', type: 'exec' }
      ],
      description: 'Branch execution based on condition'
    },
    'gate': {
      name: 'Gate',
      category: 'CONTROL',
      inputs: [
        { name: 'Enter', type: 'exec' },
        { name: 'Open', type: 'exec' },
        { name: 'Close', type: 'exec' },
        { name: 'Toggle', type: 'exec' },
        { name: 'Start Closed', type: 'bool', optional: true, defaultValue: false }
      ],
      outputs: [
        { name: 'Exit', type: 'exec' }
      ],
      description: 'Allow or block execution flow based on open/closed state'
    },
    'multigate': {
      name: 'MultiGate',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'Reset', type: 'exec' },
        { name: 'Is Random', type: 'bool', optional: true, defaultValue: false },
        { name: 'Loop', type: 'bool', optional: true, defaultValue: false },
        { name: 'Start Index', type: 'int', optional: true, defaultValue: 0 }
      ],
      outputs: [
        { name: 'Output 0', type: 'exec' },
        { name: 'Output 1', type: 'exec' },
        { name: 'Output 2', type: 'exec' },
        { name: 'Output 3', type: 'exec' }
      ],
      description: 'Route execution to different outputs in sequence or randomly',
      dynamicOutputs: true
    },
    'do_once': {
      name: 'DoOnce',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'Reset', type: 'exec' },
        { name: 'Start Closed', type: 'bool', optional: true, defaultValue: false }
      ],
      outputs: [
        { name: 'Completed', type: 'exec' }
      ],
      description: 'Execute only once until reset'
    },
    'do_n': {
      name: 'DoN',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'Reset', type: 'exec' },
        { name: 'N', type: 'int', defaultValue: 1 }
      ],
      outputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'Counter', type: 'int' }
      ],
      description: 'Execute N times then stop'
    },
    'delay': {
      name: 'Delay',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'Duration', type: 'float', defaultValue: 1.0 }
      ],
      outputs: [
        { name: 'Completed', type: 'exec' }
      ],
      description: 'Delay execution for specified duration'
    },
    'retriggerable_delay': {
      name: 'Retriggerable Delay',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'Duration', type: 'float', defaultValue: 1.0 }
      ],
      outputs: [
        { name: 'Completed', type: 'exec' }
      ],
      description: 'Delay that resets when retriggered'
    },
    'flip_flop': {
      name: 'FlipFlop',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' }
      ],
      outputs: [
        { name: 'A', type: 'exec' },
        { name: 'B', type: 'exec' },
        { name: 'Is A', type: 'bool' }
      ],
      description: 'Alternate between two outputs each time executed'
    },
    'for_loop': {
      name: 'For Loop',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'First Index', type: 'int', defaultValue: 0 },
        { name: 'Last Index', type: 'int', defaultValue: 10 }
      ],
      outputs: [
        { name: 'Loop Body', type: 'exec' },
        { name: 'Index', type: 'int' },
        { name: 'Completed', type: 'exec' }
      ],
      description: 'Execute loop body for each index in range'
    },
    'for_each_loop': {
      name: 'For Each Loop',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'Array', type: 'array' }
      ],
      outputs: [
        { name: 'Loop Body', type: 'exec' },
        { name: 'Array Element', type: 'mixed' },
        { name: 'Array Index', type: 'int' },
        { name: 'Completed', type: 'exec' }
      ],
      description: 'Execute loop body for each element in array'
    },
    'while_loop': {
      name: 'While Loop',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'Condition', type: 'bool' }
      ],
      outputs: [
        { name: 'Loop Body', type: 'exec' },
        { name: 'Completed', type: 'exec' }
      ],
      description: 'Execute loop body while condition is true'
    },

    // Additional UE-like control flow nodes
    'for_loop_with_break': {
      name: 'For Loop (With Break)',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'First Index', type: 'int', defaultValue: 0 },
        { name: 'Last Index', type: 'int', defaultValue: 10 },
        { name: 'Break', type: 'exec' }
      ],
      outputs: [
        { name: 'Loop Body', type: 'exec' },
        { name: 'Index', type: 'int' },
        { name: 'Completed', type: 'exec' }
      ],
      description: 'Loop over an index range with early break support'
    },
    'for_each_loop_with_break': {
      name: 'For Each Loop (With Break)',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'Array', type: 'array' },
        { name: 'Break', type: 'exec' }
      ],
      outputs: [
        { name: 'Loop Body', type: 'exec' },
        { name: 'Array Element', type: 'mixed' },
        { name: 'Array Index', type: 'int' },
        { name: 'Completed', type: 'exec' }
      ],
      description: 'Iterate over elements with early break support'
    },
    'switch_on_int': {
      name: 'Switch on Int',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'Selection', type: 'int' }
      ],
      outputs: [
        { name: 'Default', type: 'exec' },
        { name: 'Case 0', type: 'exec' },
        { name: 'Case 1', type: 'exec' },
        { name: 'Case 2', type: 'exec' }
      ],
      description: 'Route execution based on integer selection',
      dynamicOutputs: true
    },
    'switch_on_string': {
      name: 'Switch on String',
      category: 'CONTROL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'Selection', type: 'string' }
      ],
      outputs: [
        { name: 'Default', type: 'exec' },
        { name: 'Case 0', type: 'exec' },
        { name: 'Case 1', type: 'exec' },
        { name: 'Case 2', type: 'exec' }
      ],
      description: 'Route execution based on string selection',
      dynamicOutputs: true
    }
  },

  // ===== MATH OPERATIONS =====
  MATH: {
    'add': {
      name: 'Add',
      category: 'MATH',
      inputs: [
        { name: 'a', type: 'float' },
        { name: 'b', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Add two numbers'
    },
    'subtract': {
      name: 'Subtract',
      category: 'MATH',
      inputs: [
        { name: 'a', type: 'float' },
        { name: 'b', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Subtract b from a'
    },
    'multiply': {
      name: 'Multiply',
      category: 'MATH',
      inputs: [
        { name: 'a', type: 'float' },
        { name: 'b', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Multiply two numbers'
    },
    'divide': {
      name: 'Divide',
      category: 'MATH',
      inputs: [
        { name: 'a', type: 'float' },
        { name: 'b', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Divide a by b'
    },
    'modulo': {
      name: 'Modulo',
      category: 'MATH',
      inputs: [
        { name: 'a', type: 'int' },
        { name: 'b', type: 'int' }
      ],
      outputs: [
        { name: 'result', type: 'int' }
      ],
      description: 'Get remainder of a divided by b'
    },
    'pow': {
      name: 'Power',
      category: 'MATH',
      inputs: [
        { name: 'base', type: 'float' },
        { name: 'exponent', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Raise base to the power of exponent'
    },
    'sqrt': {
      name: 'Square Root',
      category: 'MATH',
      inputs: [
        { name: 'value', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Calculate square root'
    },
    'abs': {
      name: 'Absolute Value',
      category: 'MATH',
      inputs: [
        { name: 'value', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Get absolute value'
    },
    'min': {
      name: 'Minimum',
      category: 'MATH',
      inputs: [
        { name: 'a', type: 'float' },
        { name: 'b', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Get minimum of two values'
    },
    'max': {
      name: 'Maximum',
      category: 'MATH',
      inputs: [
        { name: 'a', type: 'float' },
        { name: 'b', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Get maximum of two values'
    },

    // Additional math utilities
    'clamp_float': {
      name: 'Clamp (Float)',
      category: 'MATH',
      inputs: [
        { name: 'value', type: 'float' },
        { name: 'min', type: 'float' },
        { name: 'max', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Clamp a float value between min and max'
    },
    'clamp_int': {
      name: 'Clamp (Int)',
      category: 'MATH',
      inputs: [
        { name: 'value', type: 'int' },
        { name: 'min', type: 'int' },
        { name: 'max', type: 'int' }
      ],
      outputs: [
        { name: 'result', type: 'int' }
      ],
      description: 'Clamp an integer value between min and max'
    },
    'lerp': {
      name: 'Lerp',
      category: 'MATH',
      inputs: [
        { name: 'a', type: 'float' },
        { name: 'b', type: 'float' },
        { name: 'alpha', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Linearly interpolate between a and b by alpha'
    },
    'fmod': {
      name: 'FMod',
      category: 'MATH',
      inputs: [
        { name: 'a', type: 'float' },
        { name: 'b', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Floating point remainder of a/b'
    },
    'trunc': {
      name: 'Truncate',
      category: 'MATH',
      inputs: [
        { name: 'value', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'int' }
      ],
      description: 'Truncate float toward zero'
    },
    'sign': {
      name: 'Sign',
      category: 'MATH',
      inputs: [
        { name: 'value', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'int' }
      ],
      description: 'Return -1, 0, or 1 depending on the sign of value'
    }
  },

  // ===== COMPARISON OPERATIONS =====
  COMPARISON: {
    'equals': {
      name: 'Equals',
      category: 'COMPARISON',
      inputs: [
        { name: 'a', type: 'mixed' },
        { name: 'b', type: 'mixed' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Check if values are equal'
    },
    'not_equals': {
      name: 'Not Equals',
      category: 'COMPARISON',
      inputs: [
        { name: 'a', type: 'mixed' },
        { name: 'b', type: 'mixed' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Check if values are not equal'
    },
    'greater_than': {
      name: 'Greater Than',
      category: 'COMPARISON',
      inputs: [
        { name: 'a', type: 'float' },
        { name: 'b', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Check if a is greater than b'
    },
    'less_than': {
      name: 'Less Than',
      category: 'COMPARISON',
      inputs: [
        { name: 'a', type: 'float' },
        { name: 'b', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Check if a is less than b'
    },
    'and': {
      name: 'Logical AND',
      category: 'COMPARISON',
      inputs: [
        { name: 'a', type: 'bool' },
        { name: 'b', type: 'bool' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Logical AND operation'
    },
    'or': {
      name: 'Logical OR',
      category: 'COMPARISON',
      inputs: [
        { name: 'a', type: 'bool' },
        { name: 'b', type: 'bool' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Logical OR operation'
    },
    'not': {
      name: 'Logical NOT',
      category: 'COMPARISON',
      inputs: [
        { name: 'value', type: 'bool' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Logical NOT operation'
    },

    // Additional comparisons and logic
    'greater_equal': {
      name: 'Greater Or Equal',
      category: 'COMPARISON',
      inputs: [
        { name: 'a', type: 'float' },
        { name: 'b', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Check if a is greater than or equal to b'
    },
    'less_equal': {
      name: 'Less Or Equal',
      category: 'COMPARISON',
      inputs: [
        { name: 'a', type: 'float' },
        { name: 'b', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Check if a is less than or equal to b'
    },
    'nearly_equal': {
      name: 'Nearly Equal (Float)',
      category: 'COMPARISON',
      inputs: [
        { name: 'a', type: 'float' },
        { name: 'b', type: 'float' },
        { name: 'tolerance', type: 'float', optional: true, defaultValue: 0.0001 }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Check if two floats are approximately equal within tolerance'
    },
    'xor': {
      name: 'Logical XOR',
      category: 'COMPARISON',
      inputs: [
        { name: 'a', type: 'bool' },
        { name: 'b', type: 'bool' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Logical exclusive OR'
    },
    'between_inclusive': {
      name: 'Between (Inclusive)',
      category: 'COMPARISON',
      inputs: [
        { name: 'value', type: 'float' },
        { name: 'min', type: 'float' },
        { name: 'max', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Check if value is between min and max (inclusive)'
    },
    'select': {
      name: 'Select (Ternary)',
      category: 'COMPARISON',
      inputs: [
        { name: 'pick A', type: 'bool' },
        { name: 'A', type: 'mixed' },
        { name: 'B', type: 'mixed' }
      ],
      outputs: [
        { name: 'result', type: 'mixed' }
      ],
      description: 'Return A if pick is true, otherwise B'
    }
  },

  // ===== STRING OPERATIONS =====
  STRING: {
    'concat': {
      name: 'Concatenate',
      category: 'STRING',
      inputs: [
        { name: 'a', type: 'string' },
        { name: 'b', type: 'string' }
      ],
      outputs: [
        { name: 'result', type: 'string' }
      ],
      description: 'Concatenate two strings'
    },
    'length': {
      name: 'String Length',
      category: 'STRING',
      inputs: [
        { name: 'string', type: 'string' }
      ],
      outputs: [
        { name: 'length', type: 'int' }
      ],
      description: 'Get string length'
    },
    'substring': {
      name: 'Substring',
      category: 'STRING',
      inputs: [
        { name: 'string', type: 'string' },
        { name: 'start', type: 'int' },
        { name: 'length', type: 'int', optional: true }
      ],
      outputs: [
        { name: 'result', type: 'string' }
      ],
      description: 'Extract substring'
    },
    'upper': {
      name: 'To Upper Case',
      category: 'STRING',
      inputs: [
        { name: 'string', type: 'string' }
      ],
      outputs: [
        { name: 'result', type: 'string' }
      ],
      description: 'Convert to uppercase'
    },
    'lower': {
      name: 'To Lower Case',
      category: 'STRING',
      inputs: [
        { name: 'string', type: 'string' }
      ],
      outputs: [
        { name: 'result', type: 'string' }
      ],
      description: 'Convert to lowercase'
    }
  },

  // ===== ARRAY OPERATIONS =====
  ARRAY: {
    'array_push': {
      name: 'Array Push',
      category: 'ARRAY',
      inputs: [
        { name: 'array', type: 'array' },
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'array', type: 'array' }
      ],
      description: 'Add element to end of array'
    },
    'array_pop': {
      name: 'Array Pop',
      category: 'ARRAY',
      inputs: [
        { name: 'array', type: 'array' }
      ],
      outputs: [
        { name: 'array', type: 'array' },
        { name: 'value', type: 'mixed' }
      ],
      description: 'Remove and return last element'
    },
    'array_length': {
      name: 'Array Length',
      category: 'ARRAY',
      inputs: [
        { name: 'array', type: 'array' }
      ],
      outputs: [
        { name: 'length', type: 'int' }
      ],
      description: 'Get array length'
    },
    'array_get': {
      name: 'Array Get',
      category: 'ARRAY',
      inputs: [
        { name: 'array', type: 'array' },
        { name: 'index', type: 'mixed' }
      ],
      outputs: [
        { name: 'value', type: 'mixed' }
      ],
      description: 'Get array element by index'
    },
    'array_set': {
      name: 'Array Set',
      category: 'ARRAY',
      inputs: [
        { name: 'array', type: 'array' },
        { name: 'index', type: 'mixed' },
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'array', type: 'array' }
      ],
      description: 'Set array element at index'
    }
  },

  // ===== TYPE CASTING =====
  CAST: {
    'to_int': {
      name: 'To Integer',
      category: 'CAST',
      inputs: [
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'result', type: 'int' }
      ],
      description: 'Cast value to integer'
    },
    'to_float': {
      name: 'To Float',
      category: 'CAST',
      inputs: [
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Cast value to float'
    },
    'to_string': {
      name: 'To String',
      category: 'CAST',
      inputs: [
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'result', type: 'string' }
      ],
      description: 'Cast value to string'
    },
    'to_bool': {
      name: 'To Boolean',
      category: 'CAST',
      inputs: [
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Cast value to boolean'
    },
    'to_array': {
      name: 'To Array',
      category: 'CAST',
      inputs: [
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'result', type: 'array' }
      ],
      description: 'Cast value to array'
    }
  },

  // ===== BITWISE OPERATIONS =====
  BITWISE: {
    'bitwise_and': {
      name: 'Bitwise AND',
      category: 'BITWISE',
      inputs: [
        { name: 'a', type: 'int' },
        { name: 'b', type: 'int' }
      ],
      outputs: [
        { name: 'result', type: 'int' }
      ],
      description: 'Bitwise AND operation'
    },
    'bitwise_or': {
      name: 'Bitwise OR',
      category: 'BITWISE',
      inputs: [
        { name: 'a', type: 'int' },
        { name: 'b', type: 'int' }
      ],
      outputs: [
        { name: 'result', type: 'int' }
      ],
      description: 'Bitwise OR operation'
    },
    'bitwise_xor': {
      name: 'Bitwise XOR',
      category: 'BITWISE',
      inputs: [
        { name: 'a', type: 'int' },
        { name: 'b', type: 'int' }
      ],
      outputs: [
        { name: 'result', type: 'int' }
      ],
      description: 'Bitwise XOR operation'
    },
    'bitwise_not': {
      name: 'Bitwise NOT',
      category: 'BITWISE',
      inputs: [
        { name: 'value', type: 'int' }
      ],
      outputs: [
        { name: 'result', type: 'int' }
      ],
      description: 'Bitwise NOT operation'
    },
    'bit_shift_left': {
      name: 'Bit Shift Left',
      category: 'BITWISE',
      inputs: [
        { name: 'value', type: 'int' },
        { name: 'positions', type: 'int' }
      ],
      outputs: [
        { name: 'result', type: 'int' }
      ],
      description: 'Shift bits left by specified positions'
    },
    'bit_shift_right': {
      name: 'Bit Shift Right',
      category: 'BITWISE',
      inputs: [
        { name: 'value', type: 'int' },
        { name: 'positions', type: 'int' }
      ],
      outputs: [
        { name: 'result', type: 'int' }
      ],
      description: 'Shift bits right by specified positions'
    }
  },

  // ===== EXCEPTION HANDLING =====
  EXCEPTION: {
    'try_catch': {
      name: 'Try Catch',
      category: 'EXCEPTION',
      inputs: [],
      outputs: [
        { name: 'exception', type: 'object' }
      ],
      description: 'Exception handling block'
    },
    'throw': {
      name: 'Throw Exception',
      category: 'EXCEPTION',
      inputs: [
        { name: 'exception', type: 'object' },
        { name: 'message', type: 'string', optional: true }
      ],
      outputs: [],
      description: 'Throw an exception'
    },
    'assert': {
      name: 'Assert',
      category: 'EXCEPTION',
      inputs: [
        { name: 'condition', type: 'bool' },
        { name: 'message', type: 'string', optional: true }
      ],
      outputs: [],
      description: 'Assert a condition is true'
    }
  },

  // ===== MEMORY & REFERENCE OPERATIONS =====
  MEMORY: {
    'is_null': {
      name: 'Is Null',
      category: 'MEMORY',
      inputs: [
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Check if value is null'
    },
    'is_defined': {
      name: 'Is Defined',
      category: 'MEMORY',
      inputs: [
        { name: 'variable_name', type: 'string' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Check if variable is defined'
    },
    'sizeof': {
      name: 'Size Of',
      category: 'MEMORY',
      inputs: [
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'size', type: 'int' }
      ],
      description: 'Get size/length of data structure'
    },
    'copy': {
      name: 'Deep Copy',
      category: 'MEMORY',
      inputs: [
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'copy', type: 'mixed' }
      ],
      description: 'Create deep copy of value'
    },
    'reference': {
      name: 'Reference',
      category: 'MEMORY',
      inputs: [
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'reference', type: 'mixed' }
      ],
      description: 'Create reference to value'
    }
  },

  // ===== ADVANCED MATH =====
  ADVANCED_MATH: {
    'sin': {
      name: 'Sine',
      category: 'ADVANCED_MATH',
      inputs: [
        { name: 'angle', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Calculate sine of angle (in radians)'
    },
    'cos': {
      name: 'Cosine',
      category: 'ADVANCED_MATH',
      inputs: [
        { name: 'angle', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Calculate cosine of angle (in radians)'
    },
    'tan': {
      name: 'Tangent',
      category: 'ADVANCED_MATH',
      inputs: [
        { name: 'angle', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Calculate tangent of angle (in radians)'
    },
    'log': {
      name: 'Logarithm',
      category: 'ADVANCED_MATH',
      inputs: [
        { name: 'value', type: 'float' },
        { name: 'base', type: 'float', optional: true, defaultValue: 2.718281828 }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Calculate logarithm of value'
    },
    'floor': {
      name: 'Floor',
      category: 'ADVANCED_MATH',
      inputs: [
        { name: 'value', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'int' }
      ],
      description: 'Round down to nearest integer'
    },
    'ceil': {
      name: 'Ceiling',
      category: 'ADVANCED_MATH',
      inputs: [
        { name: 'value', type: 'float' }
      ],
      outputs: [
        { name: 'result', type: 'int' }
      ],
      description: 'Round up to nearest integer'
    },
    'round': {
      name: 'Round',
      category: 'ADVANCED_MATH',
      inputs: [
        { name: 'value', type: 'float' },
        { name: 'precision', type: 'int', optional: true, defaultValue: 0 }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Round to specified precision'
    },
    'random': {
      name: 'Random',
      category: 'ADVANCED_MATH',
      inputs: [
        { name: 'min', type: 'float', optional: true, defaultValue: 0.0 },
        { name: 'max', type: 'float', optional: true, defaultValue: 1.0 }
      ],
      outputs: [
        { name: 'result', type: 'float' }
      ],
      description: 'Generate random number between min and max'
    },
    'random_int': {
      name: 'Random Integer',
      category: 'ADVANCED_MATH',
      inputs: [
        { name: 'min', type: 'int' },
        { name: 'max', type: 'int' }
      ],
      outputs: [
        { name: 'result', type: 'int' }
      ],
      description: 'Generate random integer between min and max'
    }
  },

  // ===== ADVANCED STRING OPERATIONS =====
  ADVANCED_STRING: {
    'split': {
      name: 'Split String',
      category: 'ADVANCED_STRING',
      inputs: [
        { name: 'string', type: 'string' },
        { name: 'delimiter', type: 'string' },
        { name: 'limit', type: 'int', optional: true }
      ],
      outputs: [
        { name: 'result', type: 'array' }
      ],
      description: 'Split string by delimiter'
    },
    'join': {
      name: 'Join Array',
      category: 'ADVANCED_STRING',
      inputs: [
        { name: 'array', type: 'array' },
        { name: 'separator', type: 'string' }
      ],
      outputs: [
        { name: 'result', type: 'string' }
      ],
      description: 'Join array elements with separator'
    },
    'trim': {
      name: 'Trim',
      category: 'ADVANCED_STRING',
      inputs: [
        { name: 'string', type: 'string' },
        { name: 'characters', type: 'string', optional: true }
      ],
      outputs: [
        { name: 'result', type: 'string' }
      ],
      description: 'Remove whitespace or specified characters from both ends'
    },
    'replace': {
      name: 'Replace',
      category: 'ADVANCED_STRING',
      inputs: [
        { name: 'string', type: 'string' },
        { name: 'search', type: 'string' },
        { name: 'replace', type: 'string' }
      ],
      outputs: [
        { name: 'result', type: 'string' }
      ],
      description: 'Replace occurrences of search string'
    },
    'find': {
      name: 'Find Substring',
      category: 'ADVANCED_STRING',
      inputs: [
        { name: 'string', type: 'string' },
        { name: 'search', type: 'string' },
        { name: 'start', type: 'int', optional: true, defaultValue: 0 }
      ],
      outputs: [
        { name: 'index', type: 'int' }
      ],
      description: 'Find index of substring (-1 if not found)'
    },
    'regex_match': {
      name: 'Regex Match',
      category: 'ADVANCED_STRING',
      inputs: [
        { name: 'string', type: 'string' },
        { name: 'pattern', type: 'string' }
      ],
      outputs: [
        { name: 'matches', type: 'bool' },
        { name: 'groups', type: 'array' }
      ],
      description: 'Test string against regular expression'
    },
    'regex_replace': {
      name: 'Regex Replace',
      category: 'ADVANCED_STRING',
      inputs: [
        { name: 'string', type: 'string' },
        { name: 'pattern', type: 'string' },
        { name: 'replacement', type: 'string' }
      ],
      outputs: [
        { name: 'result', type: 'string' }
      ],
      description: 'Replace using regular expression'
    }
  },

  // ===== ADVANCED ARRAY OPERATIONS =====
  ADVANCED_ARRAY: {
    'array_slice': {
      name: 'Array Slice',
      category: 'ADVANCED_ARRAY',
      inputs: [
        { name: 'array', type: 'array' },
        { name: 'start', type: 'int' },
        { name: 'length', type: 'int', optional: true }
      ],
      outputs: [
        { name: 'result', type: 'array' }
      ],
      description: 'Extract portion of array'
    },
    'array_concat': {
      name: 'Array Concatenate',
      category: 'ADVANCED_ARRAY',
      inputs: [
        { name: 'array1', type: 'array' },
        { name: 'array2', type: 'array' }
      ],
      outputs: [
        { name: 'result', type: 'array' }
      ],
      description: 'Concatenate two arrays'
    },
    'array_reverse': {
      name: 'Array Reverse',
      category: 'ADVANCED_ARRAY',
      inputs: [
        { name: 'array', type: 'array' }
      ],
      outputs: [
        { name: 'result', type: 'array' }
      ],
      description: 'Reverse array elements'
    },
    'array_sort': {
      name: 'Array Sort',
      category: 'ADVANCED_ARRAY',
      inputs: [
        { name: 'array', type: 'array' },
        { name: 'ascending', type: 'bool', optional: true, defaultValue: true }
      ],
      outputs: [
        { name: 'result', type: 'array' }
      ],
      description: 'Sort array elements'
    },
    'array_filter': {
      name: 'Array Filter',
      category: 'ADVANCED_ARRAY',
      inputs: [
        { name: 'array', type: 'array' },
        { name: 'predicate', type: 'callable' }
      ],
      outputs: [
        { name: 'result', type: 'array' }
      ],
      description: 'Filter array elements by predicate function'
    },
    'array_map': {
      name: 'Array Map',
      category: 'ADVANCED_ARRAY',
      inputs: [
        { name: 'array', type: 'array' },
        { name: 'function', type: 'callable' }
      ],
      outputs: [
        { name: 'result', type: 'array' }
      ],
      description: 'Transform array elements with function'
    },
    'array_reduce': {
      name: 'Array Reduce',
      category: 'ADVANCED_ARRAY',
      inputs: [
        { name: 'array', type: 'array' },
        { name: 'function', type: 'callable' },
        { name: 'initial', type: 'mixed', optional: true }
      ],
      outputs: [
        { name: 'result', type: 'mixed' }
      ],
      description: 'Reduce array to single value'
    },
    'array_find': {
      name: 'Array Find',
      category: 'ADVANCED_ARRAY',
      inputs: [
        { name: 'array', type: 'array' },
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'index', type: 'int' },
        { name: 'found', type: 'bool' }
      ],
      description: 'Find index of value in array'
    },
    'array_contains': {
      name: 'Array Contains',
      category: 'ADVANCED_ARRAY',
      inputs: [
        { name: 'array', type: 'array' },
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Check if array contains value'
    }
  },

  // ===== OBJECT/DICTIONARY OPERATIONS =====
  OBJECT: {
    'object_get': {
      name: 'Object Get Property',
      category: 'OBJECT',
      inputs: [
        { name: 'object', type: 'object' },
        { name: 'key', type: 'string' }
      ],
      outputs: [
        { name: 'value', type: 'mixed' },
        { name: 'exists', type: 'bool' }
      ],
      description: 'Get object property value'
    },
    'object_set': {
      name: 'Object Set Property',
      category: 'OBJECT',
      inputs: [
        { name: 'object', type: 'object' },
        { name: 'key', type: 'string' },
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'object', type: 'object' }
      ],
      description: 'Set object property value'
    },
    'object_has': {
      name: 'Object Has Property',
      category: 'OBJECT',
      inputs: [
        { name: 'object', type: 'object' },
        { name: 'key', type: 'string' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Check if object has property'
    },
    'object_keys': {
      name: 'Object Keys',
      category: 'OBJECT',
      inputs: [
        { name: 'object', type: 'object' }
      ],
      outputs: [
        { name: 'keys', type: 'array' }
      ],
      description: 'Get array of object keys'
    },
    'object_values': {
      name: 'Object Values',
      category: 'OBJECT',
      inputs: [
        { name: 'object', type: 'object' }
      ],
      outputs: [
        { name: 'values', type: 'array' }
      ],
      description: 'Get array of object values'
    },
    'object_merge': {
      name: 'Object Merge',
      category: 'OBJECT',
      inputs: [
        { name: 'object1', type: 'object' },
        { name: 'object2', type: 'object' }
      ],
      outputs: [
        { name: 'result', type: 'object' }
      ],
      description: 'Merge two objects'
    }
  },

  // ===== FUNCTIONS & CLOSURES =====
  FUNCTIONAL: {
    'define_function': {
      name: 'Define Function',
      category: 'FUNCTIONAL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'name', type: 'string' },
        { name: 'parameters', type: 'array' }
      ],
      outputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'function', type: 'callable' }
      ],
      description: 'Define a new function'
    },
    'call_function': {
      name: 'Call Function',
      category: 'FUNCTIONAL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'function', type: 'callable' },
        { name: 'arguments', type: 'array' }
      ],
      outputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'result', type: 'mixed' }
      ],
      description: 'Call function with arguments'
    },
    'lambda': {
      name: 'Lambda Function',
      category: 'FUNCTIONAL',
      inputs: [
        { name: 'parameters', type: 'array' }
      ],
      outputs: [
        { name: 'function', type: 'callable' }
      ],
      description: 'Create anonymous function'
    },
    'return': {
      name: 'Return',
      category: 'FUNCTIONAL',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'value', type: 'mixed', optional: true }
      ],
      outputs: [],
      description: 'Return value from function'
    }
  },

  // ===== INPUT/OUTPUT OPERATIONS =====
  IO: {
    'read_input': {
      name: 'Read Input',
      category: 'IO',
      inputs: [
        { name: 'prompt', type: 'string', optional: true }
      ],
      outputs: [
        { name: 'input', type: 'string' }
      ],
      description: 'Read user input from console'
    },
    'file_read': {
      name: 'Read File',
      category: 'IO',
      inputs: [
        { name: 'filename', type: 'string' }
      ],
      outputs: [
        { name: 'content', type: 'string' },
        { name: 'success', type: 'bool' }
      ],
      description: 'Read file contents'
    },
    'file_write': {
      name: 'Write File',
      category: 'IO',
      inputs: [
        { name: 'filename', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'append', type: 'bool', optional: true, defaultValue: false }
      ],
      outputs: [
        { name: 'success', type: 'bool' }
      ],
      description: 'Write content to file'
    },
    'file_exists': {
      name: 'File Exists',
      category: 'IO',
      inputs: [
        { name: 'filename', type: 'string' }
      ],
      outputs: [
        { name: 'result', type: 'bool' }
      ],
      description: 'Check if file exists'
    },
    'file_delete': {
      name: 'Delete File',
      category: 'IO',
      inputs: [
        { name: 'filename', type: 'string' }
      ],
      outputs: [
        { name: 'success', type: 'bool' }
      ],
      description: 'Delete file'
    }
  },

  // ===== TIME & DATE OPERATIONS =====
  TIME: {
    'current_time': {
      name: 'Current Time',
      category: 'TIME',
      inputs: [],
      outputs: [
        { name: 'timestamp', type: 'int' },
        { name: 'datetime', type: 'string' }
      ],
      description: 'Get current timestamp and datetime'
    },
    'format_time': {
      name: 'Format Time',
      category: 'TIME',
      inputs: [
        { name: 'timestamp', type: 'int' },
        { name: 'format', type: 'string' }
      ],
      outputs: [
        { name: 'result', type: 'string' }
      ],
      description: 'Format timestamp as string'
    },
    'parse_time': {
      name: 'Parse Time',
      category: 'TIME',
      inputs: [
        { name: 'datetime', type: 'string' },
        { name: 'format', type: 'string', optional: true }
      ],
      outputs: [
        { name: 'timestamp', type: 'int' },
        { name: 'success', type: 'bool' }
      ],
      description: 'Parse datetime string to timestamp'
    },
    'sleep': {
      name: 'Sleep',
      category: 'TIME',
      inputs: [
        { name: 'seconds', type: 'float' }
      ],
      outputs: [],
      description: 'Pause execution for specified seconds'
    },
    'timer_start': {
      name: 'Start Timer',
      category: 'TIME',
      inputs: [],
      outputs: [
        { name: 'timer_id', type: 'string' }
      ],
      description: 'Start a performance timer'
    },
    'timer_stop': {
      name: 'Stop Timer',
      category: 'TIME',
      inputs: [
        { name: 'timer_id', type: 'string' }
      ],
      outputs: [
        { name: 'elapsed', type: 'float' }
      ],
      description: 'Stop timer and get elapsed time'
    }
  },

  // ===== NETWORK OPERATIONS =====
  NETWORK: {
    'http_get': {
      name: 'HTTP GET',
      category: 'NETWORK',
      inputs: [
        { name: 'url', type: 'string' },
        { name: 'headers', type: 'object', optional: true }
      ],
      outputs: [
        { name: 'response', type: 'string' },
        { name: 'status_code', type: 'int' },
        { name: 'success', type: 'bool' }
      ],
      description: 'Perform HTTP GET request'
    },
    'http_post': {
      name: 'HTTP POST',
      category: 'NETWORK',
      inputs: [
        { name: 'url', type: 'string' },
        { name: 'data', type: 'mixed' },
        { name: 'headers', type: 'object', optional: true }
      ],
      outputs: [
        { name: 'response', type: 'string' },
        { name: 'status_code', type: 'int' },
        { name: 'success', type: 'bool' }
      ],
      description: 'Perform HTTP POST request'
    },
    'json_encode': {
      name: 'JSON Encode',
      category: 'NETWORK',
      inputs: [
        { name: 'data', type: 'mixed' }
      ],
      outputs: [
        { name: 'json', type: 'string' },
        { name: 'success', type: 'bool' }
      ],
      description: 'Encode data as JSON string'
    },
    'json_decode': {
      name: 'JSON Decode',
      category: 'NETWORK',
      inputs: [
        { name: 'json', type: 'string' }
      ],
      outputs: [
        { name: 'data', type: 'mixed' },
        { name: 'success', type: 'bool' }
      ],
      description: 'Decode JSON string to data'
    }
  },

  // ===== SYSTEM OPERATIONS =====
  SYSTEM: {
    'print': {
      name: 'Print',
      category: 'SYSTEM',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'Exec', type: 'exec' }
      ],
      description: 'Print value to output'
    },
    'var_dump': {
      name: 'Var Dump',
      category: 'SYSTEM',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'value', type: 'mixed' }
      ],
      outputs: [
        { name: 'Exec', type: 'exec' }
      ],
      description: 'Debug print variable information'
  },
    'exit': {
      name: 'Exit',
      category: 'SYSTEM',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'code', type: 'int', optional: true, defaultValue: 0 }
      ],
      outputs: [],
      description: 'Exit program with optional code'
    },
    'system_command': {
      name: 'System Command',
      category: 'SYSTEM',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'command', type: 'string' }
      ],
      outputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'output', type: 'string' },
        { name: 'exit_code', type: 'int' }
      ],
      description: 'Execute system command'
    },
    'get_env': {
      name: 'Get Environment Variable',
      category: 'SYSTEM',
      inputs: [
        { name: 'name', type: 'string' },
        { name: 'default', type: 'string', optional: true }
      ],
      outputs: [
        { name: 'value', type: 'string' },
        { name: 'exists', type: 'bool' }
      ],
      description: 'Get environment variable value'
    },
    'set_env': {
      name: 'Set Environment Variable',
      category: 'SYSTEM',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'name', type: 'string' },
        { name: 'value', type: 'string' }
      ],
      outputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'success', type: 'bool' }
      ],
      description: 'Set environment variable'
    },
    'emit_event': {
      name: 'Emit Event',
      category: 'SYSTEM',
      inputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'eventName', type: 'string' },
        { name: 'data', type: 'mixed', optional: true }
      ],
      outputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'eventName', type: 'string' }
      ],
      description: 'Emit a custom event with optional data'
    },
    'on_event': {
      name: 'On Event',
      category: 'SYSTEM',
      inputs: [
        { name: 'eventName', type: 'string' }
      ],
      outputs: [
        { name: 'Exec', type: 'exec' },
        { name: 'eventData', type: 'mixed' },
        { name: 'eventName', type: 'string' },
        { name: 'timestamp', type: 'int' }
      ],
      description: 'Listen for a custom event and execute when triggered'
    },
    'on_start': {
      name: 'On Start',
      category: 'SYSTEM',
      inputs: [],
      outputs: [
        { name: 'Exec', type: 'exec' }
      ],
      description: 'Entry point - executes when graph starts'
    }
  },

  // ===== CONSTANTS / LITERALS =====
  CONSTANT: {
    'literal_string': {
      name: 'String',
      category: 'CONSTANT',
      inputs: [],
      outputs: [ { name: 'value', type: 'string' } ],
      description: 'A literal string value'
    },
    'literal_int': {
      name: 'Integer',
      category: 'CONSTANT',
      inputs: [],
      outputs: [ { name: 'value', type: 'int' } ],
      description: 'A literal integer value'
    },
    'literal_float': {
      name: 'Float',
      category: 'CONSTANT',
      inputs: [],
      outputs: [ { name: 'value', type: 'float' } ],
      description: 'A literal float value'
    },
    'literal_bool': {
      name: 'Boolean',
      category: 'CONSTANT',
      inputs: [],
      outputs: [ { name: 'value', type: 'bool' } ],
      description: 'A literal boolean value'
    }
  },

  // ===== LARAVEL PRIMITIVES =====
  LARAVEL: {
    // Routing
    'route': {
      name: 'Route',
      category: 'LARAVEL',
      inputs: [
        { name: 'method', type: 'string' },
        { name: 'path', type: 'string' },
        { name: 'handler', type: 'callable' }
      ],
      outputs: [
        { name: 'Registered', type: 'bool' }
      ],
      description: 'Register a route with method, path, and handler'
    },

    // Request & Validation
    'request_input': {
      name: 'Request Input',
      category: 'LARAVEL',
      inputs: [ { name: 'key', type: 'string' }, { name: 'default', type: 'mixed', optional: true } ],
      outputs: [ { name: 'value', type: 'mixed' } ],
      description: 'Get input from the current request'
    },
    'validate': {
      name: 'Validate',
      category: 'LARAVEL',
      inputs: [ { name: 'data', type: 'object' }, { name: 'rules', type: 'object' } ],
      outputs: [ { name: 'valid', type: 'bool' }, { name: 'validated', type: 'object' }, { name: 'errors', type: 'object' } ],
      description: 'Validate data against rules'
    },

    // Eloquent (generic)
    'model_find': {
      name: 'Model Find',
      category: 'LARAVEL',
      inputs: [ { name: 'model', type: 'string' }, { name: 'id', type: 'int' } ],
      outputs: [ { name: 'model', type: 'object' }, { name: 'found', type: 'bool' } ],
      description: 'Find a model by primary key'
    },
    'model_where': {
      name: 'Model Where',
      category: 'LARAVEL',
      inputs: [ { name: 'model', type: 'string' }, { name: 'field', type: 'string' }, { name: 'op', type: 'string', optional: true }, { name: 'value', type: 'mixed' } ],
      outputs: [ { name: 'query', type: 'object' } ],
      description: 'Build a query with a where clause'
    },
    'model_get': {
      name: 'Model Get',
      category: 'LARAVEL',
      inputs: [ { name: 'query', type: 'object' } ],
      outputs: [ { name: 'results', type: 'array' } ],
      description: 'Execute query and get results'
    },
    'model_create': {
      name: 'Model Create',
      category: 'LARAVEL',
      inputs: [ { name: 'model', type: 'string' }, { name: 'attributes', type: 'object' } ],
      outputs: [ { name: 'model', type: 'object' }, { name: 'created', type: 'bool' } ],
      description: 'Create a new model with attributes'
    },
    'model_update': {
      name: 'Model Update',
      category: 'LARAVEL',
      inputs: [ { name: 'model', type: 'object' }, { name: 'attributes', type: 'object' } ],
      outputs: [ { name: 'model', type: 'object' }, { name: 'updated', type: 'bool' } ],
      description: 'Update a model with attributes'
    },
    'model_delete': {
      name: 'Model Delete',
      category: 'LARAVEL',
      inputs: [ { name: 'model', type: 'object' } ],
      outputs: [ { name: 'deleted', type: 'bool' } ],
      description: 'Delete a model instance'
    },
    'relation_load': {
      name: 'Load Relation',
      category: 'LARAVEL',
      inputs: [ { name: 'model', type: 'object' }, { name: 'relation', type: 'string' } ],
      outputs: [ { name: 'model', type: 'object' } ],
      description: 'Eager-load a relation on a model'
    },

    // Auth & Gates
    'auth_user': {
      name: 'Auth User',
      category: 'LARAVEL',
      inputs: [],
      outputs: [ { name: 'user', type: 'object' }, { name: 'authenticated', type: 'bool' } ],
      description: 'Get the currently authenticated user'
    },
    'gate_allows': {
      name: 'Gate Allows',
      category: 'LARAVEL',
      inputs: [ { name: 'ability', type: 'string' }, { name: 'arguments', type: 'array', optional: true } ],
      outputs: [ { name: 'allowed', type: 'bool' } ],
      description: 'Check an authorization ability via Gate'
    },

    // Cache
    'cache_get': {
      name: 'Cache Get',
      category: 'LARAVEL',
      inputs: [ { name: 'key', type: 'string' }, { name: 'default', type: 'mixed', optional: true } ],
      outputs: [ { name: 'value', type: 'mixed' }, { name: 'hit', type: 'bool' } ],
      description: 'Retrieve a value from cache'
    },
    'cache_put': {
      name: 'Cache Put',
      category: 'LARAVEL',
      inputs: [ { name: 'key', type: 'string' }, { name: 'value', type: 'mixed' }, { name: 'seconds', type: 'int' } ],
      outputs: [ { name: 'success', type: 'bool' } ],
      description: 'Store a value in cache for given seconds'
    },

    // Events & Jobs
    'event_dispatch': {
      name: 'Dispatch Event',
      category: 'LARAVEL',
      inputs: [ { name: 'event', type: 'string' }, { name: 'payload', type: 'object', optional: true } ],
      outputs: [],
      description: 'Dispatch a domain event'
    },
    'job_dispatch': {
      name: 'Dispatch Job',
      category: 'LARAVEL',
      inputs: [ { name: 'job', type: 'string' }, { name: 'payload', type: 'object', optional: true } ],
      outputs: [ { name: 'queued', type: 'bool' } ],
      description: 'Dispatch a queued job'
    },

    // Views & Responses
    'view_make': {
      name: 'Make View',
      category: 'LARAVEL',
      inputs: [ { name: 'view', type: 'string' }, { name: 'data', type: 'object', optional: true } ],
      outputs: [ { name: 'html', type: 'string' } ],
      description: 'Render a Blade view into HTML'
    },
    'response_json': {
      name: 'JSON Response',
      category: 'LARAVEL',
      inputs: [ { name: 'data', type: 'mixed' }, { name: 'status', type: 'int', optional: true } ],
      outputs: [ { name: 'response', type: 'object' } ],
      description: 'Return a JSON HTTP response'
    },
    'mail_send': {
      name: 'Send Mail',
      category: 'LARAVEL',
      inputs: [ { name: 'to', type: 'string' }, { name: 'subject', type: 'string' }, { name: 'body', type: 'string' } ],
      outputs: [ { name: 'sent', type: 'bool' } ],
      description: 'Send an email'
    },
    'notify_send': {
      name: 'Send Notification',
      category: 'LARAVEL',
      inputs: [ { name: 'notifiable', type: 'object' }, { name: 'notification', type: 'string' }, { name: 'data', type: 'object', optional: true } ],
      outputs: [ { name: 'sent', type: 'bool' } ],
      description: 'Send a notification to a notifiable entity'
    }
  }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Get all available types
 */
export function getAllTypes() {
  return {
    ...TYPES.PRIMITIVE,
    ...TYPES.COMPLEX,
    ...TYPES.SPECIAL,
    ...TYPES.CONTROL
  };
}

/**
 * Get type information
 */
export function getTypeInfo(typeName) {
  const allTypes = getAllTypes();
  return allTypes[typeName] || null;
}

/**
 * Get color for a type
 */
export function getTypeColor(typeName) {
  const typeInfo = getTypeInfo(typeName);
  return typeInfo ? typeInfo.color : 'gray';
}

/**
 * Check if two types are compatible
 */
export function areTypesCompatible(fromType, toType) {
  if (fromType === toType) return true;
  
  const fromTypeInfo = getTypeInfo(fromType);
  if (!fromTypeInfo) return false;
  
  return fromTypeInfo.compatible.includes(toType);
}

/**
 * Get all node definitions for a category
 */
export function getNodesByCategory(category) {
  const categoryKey = category?.toUpperCase() ?? '';
  const base = NODE_DEFINITIONS[categoryKey] || {};
  const extras = EXTRA_NODE_DEFINITIONS[categoryKey] || {};
  return { ...base, ...extras };
}

/**
 * Get node definition by id
 */
export function getNodeDefinition(nodeId) {
  // Search extras first to allow overrides
  for (const category of Object.values(EXTRA_NODE_DEFINITIONS)) {
    if (category[nodeId]) return category[nodeId];
  }
  for (const category of Object.values(NODE_DEFINITIONS)) {
    if (category[nodeId]) {
      return category[nodeId];
    }
  }
  return null;
}

/**
 * Get color for a node category
 */
export function getCategoryColor(category) {
  const categoryInfo = NODE_CATEGORIES[category?.toUpperCase()] ?? null;
  return categoryInfo ? categoryInfo.color : 'gray';
}

/**
 * Get all available node definitions
 */
export function getAllNodeDefinitions() {
  const allNodes = {};
  const merged = {};
  for (const [categoryKey, nodes] of Object.entries(NODE_DEFINITIONS)) {
    merged[categoryKey] = { ...(merged[categoryKey] || {}), ...nodes };
  }
  for (const [categoryKey, nodes] of Object.entries(EXTRA_NODE_DEFINITIONS)) {
    merged[categoryKey] = { ...(merged[categoryKey] || {}), ...nodes };
  }
  for (const [categoryKey, nodes] of Object.entries(merged)) {
    for (const [nodeId, nodeDef] of Object.entries(nodes)) {
      allNodes[nodeId] = {
        id: nodeId,
        name: nodeDef?.name ?? nodeId,
        category: nodeDef?.category ?? categoryKey,
        description: nodeDef?.description ?? '',
        inputs: nodeDef?.inputs ?? [],
        outputs: nodeDef?.outputs ?? [],
        dynamicOutputs: nodeDef?.dynamicOutputs ?? false,
        categoryKey
      };
    }
  }
  return allNodes;
}

// Support for external JSON specs
const EXTRA_NODE_DEFINITIONS = {};
export function registerExtraNodeDefinitions(extra = {}) {
  for (const [categoryKey, nodes] of Object.entries(extra || {})) {
    EXTRA_NODE_DEFINITIONS[categoryKey] = { ...(EXTRA_NODE_DEFINITIONS[categoryKey] || {}), ...(nodes || {}) };
  }
  try { if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') { window.dispatchEvent(new CustomEvent('language-definitions-updated')); } } catch {}
}

/**
 * Convert color name to hex value for SVG use
 */
export function getTypeColorHex(typeName) {
  const colorName = getTypeColor(typeName);
  
  const colorMap = {
    'emerald': '#10b981',
    'pink': '#ec4899', 
    'red': '#ef4444',
    'orange': '#f97316',
    'violet': '#8b5cf6',
    'indigo': '#6366f1',
    'gray': '#6b7280',
    'slate': '#64748b',
    'zinc': '#71717a',
    'amber': '#f59e0b',
    'white': '#ffffff',
    'blue': '#3b82f6',
    'purple': '#a855f7',
    'yellow': '#eab308',
    'green': '#22c55e',
    'cyan': '#06b6d4'
  };
  
  return colorMap[colorName] || '#6b7280'; // Default to gray
}
