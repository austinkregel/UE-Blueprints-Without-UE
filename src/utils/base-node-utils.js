// Backward-compatibility re-exports. The codebase has been modularized.
// Prefer importing directly from the specific modules (state, nodes-core, node-creation, etc.).

// Core reactive state and logger
export {nodes, nextId, ioPositions, selectedNodeId, draggingConnection, debugMode, log} from './state.js';

// Node CRUD and IO updates
export {addNode, moveNode, deleteNode, updateNodeIO} from './nodes-core.js';

// Selection helpers
export {selectNode, closeSettings} from './node-selection.js';

// Connection visuals and helpers
export {
    getConnectionColor, getDraggingConnectionColor, renderDraggingConnection, isActionFlow
} from './connection-visuals.js';

// IO positions lookups and registration helpers (via io-utils)
export {getIOPosition} from './io-positions.js';
export {registerIO, registerAllIOForNode, renderConnectionPath, getConnectionPointsArray} from './io-utils.js';

// Dragging connections
export {startConnectionDrag, onConnectionDragMove, onConnectionDragEnd} from './drag-connect.js';

// Connection manager
export {connections, addConnection, removeConnection, clearConnections} from './connection-manager.js';

// Node creation utilities (data/control/exec families and patterns)
export {
    addNodeFromDefinition,
    addBitwiseNode,
    addExceptionNode,
    addMemoryNode,
    addAdvancedMathNode,
    addAdvancedStringNode,
    addAdvancedArrayNode,
    addObjectNode,
    addFunctionalNode,
    addIONode,
    addTimeNode,
    addNetworkNode,
    addCastNode,
    addComparisonNode,
    addControlNode,
    addMathNode,
    addStringNode,
    addArrayNode,
    addNodePattern,
    addExecFlowNode,
    addSequenceNode,
    addBranchNode,
    addGateNode,
    addMultigateNode,
    addDoOnceNode,
    addDoNNode,
    addDelayNode,
    addFlipFlopNode,
    addForLoopNode,
    addForEachLoopNode,
    addWhileLoopNode,
    addExecFlowPattern,
    getNextNodeId
} from './node-creation.js';

// Component resolver
export {getNodeComponent} from './get-node-component.js';

// Node interaction behavior for NodeBase
export {construction} from './node-interaction.js';
