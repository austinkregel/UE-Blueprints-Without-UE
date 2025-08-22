<template>
    <div
        ref="editorAreaRef"
        :class="{ 'drag-over': isDragOver }"
        class="relative z-0 flex-1"
        @contextmenu="onContextMenu"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @mousedown="onEditorMouseDown"
        @wheel="onWheel"
        @dragover.prevent="onDragOver"
        @dragenter.prevent="onDragEnter"
    >
        <!-- Infinite Canvas Container -->
        <div class="absolute inset-0 z-0 overflow-hidden">
            <!-- Background Grid -->
            <div
                class="absolute inset-0 bg-grid"
                :style="{
                    transform: `translate(${adjustedGridOffset.x}px, ${adjustedGridOffset.y}px)`,
                    backgroundSize: `${Math.max(gridSize * viewport.zoom, 1)}px ${Math.max(gridSize * viewport.zoom, 1)}px`,
                    backgroundImage: `
                        linear-gradient(to right, rgba(50, 50, 50, 0.2) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(50, 50, 50, 0.2) 1px, transparent 1px),
                        linear-gradient(to right, rgba(100, 100, 100, 0.4) ${Math.min(1, Math.max(5 * (gridSize / viewport.zoom), 1))}px, transparent ${Math.min(1, Math.max(5 * gridSize / viewport.zoom, 1))}px),
                        linear-gradient(to bottom, rgba(100, 100, 100, 0.4) ${Math.min(1, Math.max(5 * (gridSize / viewport.zoom), 1))}px, transparent ${Math.min(1, Math.max(5 * gridSize / viewport.zoom, 1))}px)`
                }"
            ></div>

            <div :style="{ transform: getViewportTransform() }" class="canvas-content">
                <!-- Connections under nodes -->
                <svg
                    class="connections pointer-events-none absolute z-0"
                    preserveAspectRatio="none"
                    style="left: -5000px; top: -5000px; width: 10000px; height: 10000px"
                    viewBox="-5000 -5000 10000 10000"
                >
                    <g v-if="debugMode">
                        <circle v-for="node in nodes" :key="'center-' + node.id" :cx="node.x" :cy="node.y" fill="red" pointer-events="none" r="8" />
                        <text
                            v-for="node in nodes"
                            :key="'center-label-' + node.id"
                            :x="node.x + 12"
                            :y="node.y - 12"
                            fill="red"
                            font-size="14"
                            pointer-events="none"
                        >
                            {{ `Node ${node.id} (${Math.round(node.x)},${Math.round(node.y)})` }}
                        </text>
                        <template v-if="draggingConnection && draggingConnection.dragPos">
                            <circle :cx="draggingConnection.dragPos.x" :cy="draggingConnection.dragPos.y" fill="orange" pointer-events="none" r="7" />
                            <text
                                :x="draggingConnection.dragPos.x + 12"
                                :y="draggingConnection.dragPos.y - 12"
                                fill="orange"
                                font-size="13"
                                pointer-events="none"
                            >
                                {{ `Drag (${draggingConnection.dragPos.x},${draggingConnection.dragPos.y})` }}
                            </text>
                        </template>
                    </g>
                    <g v-for="conn in getConnections()" :key="`${conn.from.nodeId}:${conn.from.output}->${conn.to.nodeId}:${conn.to.input}`">
                        <path
                            v-if="getConnectionPointsArray(conn)"
                            :d="renderConnectionPath(getConnectionPointsArray(conn))"
                            :stroke="getConnectionColor(conn)"
                            :stroke-width="isActionFlow(conn) ? 5 : 3"
                            fill="none"
                        />
                    </g>
                    <defs>
                        <marker id="arrow" markerHeight="10" markerUnits="strokeWidth" markerWidth="10" orient="auto" refX="10" refY="5">
                            <path d="M0,0 L10,5 L0,10 z" fill="#ff0" />
                        </marker>
                    </defs>
                    <path
                        v-if="renderDraggingConnection()"
                        :d="renderDraggingConnection()"
                        :marker-end="draggingConnection.value && isActionFlow(draggingConnection.value) ? 'url(#arrow)' : null"
                        :stroke="draggingConnection.value && isActionFlow(draggingConnection.value) ? '#ff0' : '#0ff'"
                        :stroke-width="draggingConnection.value && isActionFlow(draggingConnection.value) ? 5 : 3"
                        fill="none"
                        pointer-events="none"
                    />
                </svg>

                <!-- Nodes above connections -->
                <div v-for="node in nodes" :key="node.id" class="relative z-10">
                    <component
                        :is="getNodeComponent(node)"
                        :connections="getConnections()"
                        :node="node"
                        @connect="addConnection"
                        @move="moveNode"
                        @select="selectNode"
                        @start-connection-drag="startConnectionDrag"
                        @delete-connection="removeConnection"
                        @node-context-menu="onNodeContextMenu"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { activeWorkspace, draggingConnection, nodes } from '../../utils/state.js';
    import { getConnectionColor, isActionFlow, renderDraggingConnection } from '../../utils/connection-visuals.js';
    import { selectNode } from '../../utils/node-selection.js';
    import { getNodeComponent } from '../../utils/get-node-component.js';
    import { startConnectionDrag } from '../../utils/drag-connect.js';
    import { moveNode } from '../../utils/nodes-core.js';
    import { getConnectionPointsArray, renderConnectionPath } from '../../utils/io-utils.js';
    import { addConnection, getConnections, removeConnection } from '../../utils/connection-manager.js';
    import { onEditorMouseDown as onEditorMouseDownUtil } from '../../utils/editor-utils.js';
    import { getViewportTransform, setCanvasOffset, setZoom, viewport, adjustGridToWorld } from '../../utils/viewport-utils.js';

    const props = defineProps({
        debugMode: { type: Boolean, default: false }
    });

    const emit = defineEmits(['context-menu', 'drop-node', 'node-context-menu', 'deselect']);

    const isDragOver = ref(false);
    const editorAreaRef = ref(null);

    const gridSize = 50; // Base grid size

    const adjustedGridOffset = ref(adjustGridToWorld({
            x: -(viewport.x % (gridSize / viewport.zoom)),
            y: -(viewport.y % (gridSize / viewport.zoom))
        }, gridSize, viewport.zoom));

    // Watch for changes in the active workspace
    watch(activeWorkspace, (newWorkspace) => {
        if (newWorkspace) {
            nodes.value = newWorkspace.nodes;
            draggingConnection.value = newWorkspace.draggingConnection;
        }
    });

    function updateCanvasOffset() {
        const rect = editorAreaRef.value?.getBoundingClientRect();
        if (rect) setCanvasOffset(rect.left, rect.top);
    }

    onMounted(() => {
        updateCanvasOffset();
        window.addEventListener('resize', updateCanvasOffset);
        // Observe container size/position changes (e.g., sidebars toggling)
        if (typeof ResizeObserver !== 'undefined' && editorAreaRef.value) {
            const ro = new ResizeObserver(() => updateCanvasOffset());
            ro.observe(editorAreaRef.value);
            // store on instance for cleanup
            editorAreaRef.value.__ro = ro;
        }
    });

    onBeforeUnmount(() => {
        window.removeEventListener('resize', updateCanvasOffset);
        const el = editorAreaRef.value;
        if (el && el.__ro) {
            try {
                el.__ro.disconnect();
            } catch {}
            el.__ro = null;
        }
    });

    function onContextMenu(event) {
        // Always update the canvas offset before emitting the event
        emit('context-menu', event);
    }

    function onNodeContextMenu(payload) {
        // forward node context menu event to parent
        emit('node-context-menu', payload);
    }

    function onWheel(event) {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = event.clientX - rect.left;
        const centerY = event.clientY - rect.top;
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = viewport.value.zoom * zoomFactor;
        setZoom(newZoom, centerX, centerY);
    }

    function onDragEnter(event) {
        event.preventDefault();
        isDragOver.value = true;
    }

    function onDragOver(event) {
        event.preventDefault();
    }

    function onDragLeave(event) {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            isDragOver.value = false;
        }
    }

    function onDrop(event) {
        event.preventDefault();
        isDragOver.value = false;
        emit('drop-node', event);
    }

    function onEditorMouseDown(event) {
        // Call the shared utility, passing emit so it can emit 'deselect' if needed
        onEditorMouseDownUtil(event, emit);
    }
</script>

<style>
    @reference "tailwindcss";
    .canvas-content {
        @apply absolute top-0 left-0 h-full w-full select-none;
        transform-origin: 0 0;
    }

    .drag-over {
        @apply border-2 border-dashed border-blue-500/50 bg-blue-500/10 transition-all duration-200 ease-in-out;
    }

    .drag-over::before {
        content: 'Drop node here';
        @apply pointer-events-none absolute top-1/2 left-1/2 z-[1000] -translate-x-1/2 -translate-y-1/2 transform text-2xl font-bold text-blue-500/80;
    }

    .bg-grid {
        background-image: linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
    }
</style>
