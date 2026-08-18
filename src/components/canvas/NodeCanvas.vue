<template>
    <div
        ref="editorAreaRef"
        :class="{ 'drag-over': isDragOver }"
        class="node-canvas-surface relative z-0 flex-1"
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
            <!-- Background dot grid -->
            <div
                class="node-canvas-dots absolute inset-0"
                :style="{
                    transform: `translate(${adjustedGridOffset.x}px, ${adjustedGridOffset.y}px)`,
                    backgroundSize: `${Math.max(gridSize * viewport.zoom, 1)}px ${Math.max(gridSize * viewport.zoom, 1)}px`
                }"
            ></div>
            <!-- Vignette -->
            <div class="node-canvas-vignette pointer-events-none absolute inset-0"></div>

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

        <!-- Pin-types legend -->
        <div class="bp-overlay bp-legend">
            <div class="eyebrow">Pin Types</div>
            <div class="items">
                <span class="li"><i class="exec" style="background: var(--t-exec)"></i>exec</span>
                <span class="li"><i style="background: var(--t-object)"></i>object</span>
                <span class="li"><i style="background: var(--t-string)"></i>string</span>
                <span class="li"><i style="background: var(--t-int)"></i>number</span>
                <span class="li"><i style="background: var(--t-bool)"></i>bool</span>
                <span class="li"><i style="background: var(--t-array)"></i>array</span>
            </div>
        </div>

        <!-- Zoom controls -->
        <div class="bp-overlay bp-zoompill" @mousedown.stop>
            <button title="Zoom out" @click="zoomBy(0.9)">−</button>
            <span class="zval">{{ Math.round(viewport.zoom * 100) }}%</span>
            <button title="Zoom in" @click="zoomBy(1.1)">+</button>
        </div>

        <!-- Minimap -->
        <div class="bp-overlay bp-minimap" @mousedown.stop @click="minimapClick" title="Click to focus">
            <span class="mm-head eyebrow">Map</span>
            <span v-for="b in minimap.blips" :key="b.id" class="blip" :class="`na-${b.color}`" :style="{ left: b.x + 'px', top: b.y + 'px' }"></span>
            <div
                class="view"
                :style="{ left: minimap.view.x + 'px', top: minimap.view.y + 'px', width: minimap.view.w + 'px', height: minimap.view.h + 'px' }"
            ></div>
        </div>
    </div>
</template>

<script setup>
    import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
    import { activeWorkspace, draggingConnection, nodes } from '../../utils/state.js';
    import { getConnectionColor, isActionFlow, renderDraggingConnection } from '../../utils/connection-visuals.js';
    import { selectNode } from '../../utils/node-selection.js';
    import { getNodeComponent } from '../../utils/get-node-component.js';
    import { startConnectionDrag } from '../../utils/drag-connect.js';
    import { moveNode } from '../../utils/nodes-core.js';
    import { getConnectionPointsArray, renderConnectionPath } from '../../utils/io-utils.js';
    import { addConnection, getConnections, removeConnection } from '../../utils/connection-manager.js';
    import { onEditorMouseDown as onEditorMouseDownUtil } from '../../utils/editor-utils.js';
    import {
        adjustGridToWorld,
        canvasOffset,
        canvasSize,
        focusWorldPoint,
        getViewportTransform,
        screenToWorld,
        setCanvasOffset,
        setCanvasSize,
        setZoom,
        viewport
    } from '../../utils/viewport-utils.js';
    import { getNodeColor } from '../../utils/node-colors.js';

    defineProps({
        debugMode: { type: Boolean, default: false }
    });

    const emit = defineEmits(['context-menu', 'drop-node', 'node-context-menu', 'deselect']);

    const isDragOver = ref(false);
    const editorAreaRef = ref(null);

    const gridSize = 50; // Base grid size

    const adjustedGridOffset = ref(
        adjustGridToWorld(
            {
                x: -(viewport.x % (gridSize / viewport.zoom)),
                y: -(viewport.y % (gridSize / viewport.zoom))
            },
            gridSize,
            viewport.zoom
        )
    );

    // Watch for changes in the active workspace
    watch(activeWorkspace, (newWorkspace) => {
        if (newWorkspace) {
            nodes.value = newWorkspace.nodes;
            draggingConnection.value = newWorkspace.draggingConnection;
        }
    });

    function updateCanvasOffset() {
        const rect = editorAreaRef.value?.getBoundingClientRect();
        if (rect) {
            setCanvasOffset(rect.left, rect.top);
            setCanvasSize(rect.width, rect.height);
        }
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

    function zoomBy(factor) {
        const rect = editorAreaRef.value?.getBoundingClientRect();
        const cx = rect ? rect.width / 2 : 0;
        const cy = rect ? rect.height / 2 : 0;
        setZoom(viewport.value.zoom * factor, cx, cy);
    }

    // ----- minimap -----
    const MM = { w: 172, h: 100, pad: 10 };
    const NODE_W = 220; // approx node footprint for bounds
    const NODE_H = 120;

    const minimap = computed(() => {
        const ns = nodes.value;
        const w = canvasSize.value.w || 800;
        const h = canvasSize.value.h || 600;
        const off = canvasOffset.value;
        // Current visible world region (top-left / bottom-right).
        const tl = screenToWorld(off.x, off.y);
        const br = screenToWorld(off.x + w, off.y + h);
        let minX = Math.min(tl.x, br.x);
        let minY = Math.min(tl.y, br.y);
        let maxX = Math.max(tl.x, br.x);
        let maxY = Math.max(tl.y, br.y);
        for (const n of ns) {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + NODE_W);
            maxY = Math.max(maxY, n.y + NODE_H);
        }
        const bw = Math.max(1, maxX - minX);
        const bh = Math.max(1, maxY - minY);
        const scale = Math.min((MM.w - MM.pad * 2) / bw, (MM.h - MM.pad * 2) / bh);
        const map = (wx, wy) => ({ x: MM.pad + (wx - minX) * scale, y: MM.pad + (wy - minY) * scale });
        const blips = ns.map((n) => ({ id: n.id, ...map(n.x, n.y), color: getNodeColor(n.type, n.nodeDefId) || 'blue' }));
        const v1 = map(tl.x, tl.y);
        const v2 = map(br.x, br.y);
        const view = { x: Math.min(v1.x, v2.x), y: Math.min(v1.y, v2.y), w: Math.abs(v2.x - v1.x), h: Math.abs(v2.y - v1.y) };
        return { blips, view, minX, minY, scale };
    });

    function minimapClick(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const m = minimap.value;
        if (!m.scale) return;
        const wx = m.minX + (e.clientX - rect.left - MM.pad) / m.scale;
        const wy = m.minY + (e.clientY - rect.top - MM.pad) / m.scale;
        focusWorldPoint(wx, wy);
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

    .node-canvas-surface {
        background-color: var(--canvas-bg);
    }

    .node-canvas-dots {
        background-image: radial-gradient(circle, var(--canvas-dot) 1.3px, transparent 1.4px);
        background-position: -1px -1px;
    }

    /* Soft radial vignette so the graph reads as a focused stage. */
    .node-canvas-vignette {
        background: radial-gradient(120% 120% at 45% 38%, transparent 52%, rgba(4, 7, 11, 0.6) 100%);
    }
</style>
