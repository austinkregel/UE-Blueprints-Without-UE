import { computed, reactive, ref } from 'vue';

// Global editor state
export const nodes = ref([]);
export const nextId = ref(9);
export const ioPositions = ref({}); // { [nodeId]: { inputs: {name: {x,y}}, outputs: {name: {x,y}} } }
export const selectedNodeId = ref(null);
export const draggingConnection = ref(null); // { from: {nodeId, output}, to: {nodeId, input}, type: 'input'|'output', start: {x, y}, mouse: {x, y} }
export const debugMode = ref(false);

export function log(...args) {
    if (debugMode.value) {
        console.log('[DEBUG]', ...args);
    }
}

// Workspace-specific state
export const workspaceState = reactive({
    workspaces: {}, // { workspaceId: { nodes: [], ioPositions: {}, selectedNodeId: null, draggingConnection: null } }
    activeWorkspaceId: null
});

export const activeWorkspace = computed(() => {
    if (workspaceState.activeWorkspaceId) {
        const workspace = workspaceState.workspaces[workspaceState.activeWorkspaceId];
        if (!workspace.connections) {
            workspace.connections = [];
        }
        if (!workspace.nodes) {
            workspace.nodes = [];
        }
        if (!workspace.ioPositions) {
            workspace.ioPositions = {};
        }
        if (workspace.selectedNodeId === undefined) {
            workspace.selectedNodeId = null;
        }
        if (workspace.draggingConnection === undefined) {
            workspace.draggingConnection = null;
        }
        return workspace;
    }
    return null;
});

export function createWorkspace(workspaceId, workspace = {}) {
    if (!workspaceState.workspaces[workspaceId]) {
        workspaceState.workspaces[workspaceId] = {
            name: workspace.name || `Workspace ${workspaceId}`,
            nodes: workspace.nodes || [],
            ioPositions: workspace.ioPositions || {},
            selectedNodeId: workspace.selectedNodeId || null,
            draggingConnection: workspace.draggingConnection || null,
            connections: workspace.connections || []
        };
    }
    workspaceState.activeWorkspaceId = workspaceId;
}

export function switchWorkspace(workspaceId) {
    if (workspaceState.workspaces[workspaceId]) {
        workspaceState.activeWorkspaceId = workspaceId;
    }
}

export function deleteWorkspace(workspaceId) {
    if (workspaceState.workspaces[workspaceId]) {
        delete workspaceState.workspaces[workspaceId];
        if (workspaceState.activeWorkspaceId === workspaceId) {
            workspaceState.activeWorkspaceId = Object.keys(workspaceState.workspaces)[0] || null;
        }
    }
}
