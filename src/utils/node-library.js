/**
 * Node Library - Central registry for all available system and engine nodes
 * This file provides easy access to all predefined nodes that can be used in the visual editor
 */

import {getAllNodeDefinitions, getNodesByCategory, NODE_CATEGORIES} from './language-definition.js';

/**
 * Helper function to search nodes by name or description
 */
export function searchNodes(searchTerm) {
    const allNodes = getAllNodeDefinitions();
    const results = {};

    for (const [nodeId, nodeDef] of Object.entries(allNodes)) {
        if (
            nodeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nodeDef.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nodeDef.description?.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
            results[nodeId] = nodeDef;
        }
    }

    return results;
}

/**
 * Helper function to get system nodes
 */
export function getSystemNodes() {
    return getNodesByCategory('SYSTEM');
}

/**
 * Helper function to get event nodes
 */
export function getEventNodes() {
    return getNodesByCategory('CONTROL');
}

/**
 * Get all available system and engine nodes organized by category
 */
export function getNodeLibrary() {
    return {
        categories: NODE_CATEGORIES,
        nodes: getAllNodeDefinitions()
    };
}

/**
 * Get nodes for a specific category (for node palette/menu)
 */
export function getNodesForCategory(categoryName) {
    return getNodesByCategory(categoryName.toUpperCase());
}

/**
 * Get commonly used starter nodes
 */
export function getStarterNodes() {
    return {
        events: getEventNodes(),
        basic: getMathNodes(),
        flow: getFlowControlNodes(),
        system: getSystemNodes()
    };
}

/**
 * Get game engine specific nodes
 */
export function getGameEngineNodes() {
    return getSystemNodes(); // Game engine nodes would be part of system nodes
}

/**
 * Get system/utility nodes
 */
export function getSystemUtilityNodes() {
    return {
        io: getIONodes(),
        network: getNetworkNodes(),
        system: getSystemNodes(),
        time: getTimeNodes()
    };
}

/**
 * Get all math and comparison nodes
 */
export function getMathNodes() {
    return getNodesByCategory('MATH');
}

/**
 * Get flow control nodes
 */
export function getFlowControlNodes() {
    return getNodesByCategory('CONTROL');
}

/**
 * Get string manipulation nodes
 */
export function getStringNodes() {
    return getNodesByCategory('STRING');
}

/**
 * Get array manipulation nodes
 */
export function getArrayNodes() {
    return getNodesByCategory('ARRAY');
}

/**
 * Get type casting nodes
 */
export function getCastNodes() {
    return getNodesByCategory('CAST');
}

/**
 * Get bitwise operation nodes
 */
export function getBitwiseNodes() {
    return getNodesByCategory('BITWISE');
}

/**
 * Get exception handling nodes
 */
export function getExceptionNodes() {
    return getNodesByCategory('EXCEPTION');
}

/**
 * Get memory and reference operation nodes
 */
export function getMemoryNodes() {
    return getNodesByCategory('MEMORY');
}

/**
 * Get advanced math nodes
 */
export function getAdvancedMathNodes() {
    return getNodesByCategory('ADVANCED_MATH');
}

/**
 * Get advanced string manipulation nodes
 */
export function getAdvancedStringNodes() {
    return getNodesByCategory('ADVANCED_STRING');
}

/**
 * Get advanced array operation nodes
 */
export function getAdvancedArrayNodes() {
    return getNodesByCategory('ADVANCED_ARRAY');
}

/**
 * Get object/dictionary operation nodes
 */
export function getObjectNodes() {
    return getNodesByCategory('OBJECT');
}

/**
 * Get functional programming nodes
 */
export function getFunctionalNodes() {
    return getNodesByCategory('FUNCTIONAL');
}

/**
 * Get input/output operation nodes
 */
export function getIONodes() {
    return getNodesByCategory('IO');
}

/**
 * Get time and date operation nodes
 */
export function getTimeNodes() {
    return getNodesByCategory('TIME');
}

/**
 * Get network operation nodes
 */
export function getNetworkNodes() {
    return getNodesByCategory('NETWORK');
}

/**
 * Get enhanced system operation nodes
 */
export function getEnhancedSystemNodes() {
    return getSystemNodes();
}

/**
 * Get all programming language features organized by paradigm
 */
export function getProgrammingParadigmNodes() {
    return {
        imperative: {
            control_flow: getFlowControlNodes(),
            variables: getSystemNodes(),
            io: getIONodes()
        },

        object_oriented: {
            objects: getObjectNodes(),
            memory: getMemoryNodes(),
            exceptions: getExceptionNodes()
        },

        functional: {
            functions: getFunctionalNodes(),
            array_operations: getAdvancedArrayNodes(),
            pure_functions: getMathNodes()
        },

        system: {
            memory: getMemoryNodes(),
            bitwise: getBitwiseNodes(),
            system_calls: getSystemNodes(),
            time: getTimeNodes()
        },

        data_processing: {
            strings: {
                ...getStringNodes(),
                ...getAdvancedStringNodes()
            },
            arrays: {
                ...getArrayNodes(),
                ...getAdvancedArrayNodes()
            },
            objects: getObjectNodes(),
            casting: getCastNodes()
        },

        network: {
            http: getNetworkNodes()
        }
    };
}

/**
 * Search available nodes
 */
export function searchNodeLibrary(searchTerm) {
    return searchNodes(searchTerm);
}

/**
 * Get recommended nodes for a given context
 */
export function getRecommendedNodes(context = {}) {
    const {nodeType, outputType, inputType, category} = context;

    if (nodeType === 'starter') {
        return getStarterNodes();
    }

    if (category) {
        return getNodesForCategory(category);
    }

    // If we have type information, suggest compatible nodes
    if (outputType || inputType) {
        // This could be expanded to suggest nodes based on type compatibility
        return {};
    }

    // Default recommendations
    return {
        events: getEventNodes(),
        flow: getFlowControlNodes().sequence,
        math: getMathNodes().arithmetic,
        system: getSystemUtilityNodes().io
    };
}

/**
 * Export everything for easy importing
 */
export default {
    getAllNodeDefinitions,
    getNodesByCategory,
    getSystemNodes,
    getEventNodes,
    searchNodes
};
