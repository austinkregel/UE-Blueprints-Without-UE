<template>
    <div
        ref="nodeRef"
        :class="[
            'bp-node',
            `na-${nodeColorName}`,
            isSelected ? 'sel' : '',
            node.disabled ? 'bp-node-disabled' : '',
            executionStatusClass,
            'absolute inline-block max-w-[420px] min-w-[220px] cursor-grab text-sm select-none'
        ]"
        :data-node-id="node.id"
        :style="{ left: node.x + 'px', top: node.y + 'px' }"
        @mousedown.stop="handleMouseDown"
        @click.stop="handleClick"
        @contextmenu.stop.prevent="handleNodeContextMenu"
    >
        <div v-if="nodeIssues.length" class="bp-warn-badge" :class="{ error: nodeHasError }" :title="`${nodeIssues.length} issue(s)`">
            ⚠ {{ nodeIssues.length }}
        </div>
        <div v-if="shouldShowHeader" class="bp-node-head relative z-10">
            <span class="bp-glyph"><NodeGlyph :name="glyphName" /></span>
            <span class="bp-title"
                ><slot name="header">{{ getDefaultHeaderText() }}</slot></span
            >
            <span v-if="executionStatus.executed" class="bp-node-exec">
                <span v-if="executionStatus.success === false">❌</span>
                <span v-else>✅</span>
            </span>
        </div>
        <slot></slot>
        <div class="relative z-10 flex flex-wrap justify-between p-2">
            <template v-if="node.dynamicOutputs">
                <button @click="addDynamicOutput">Add Output</button>
                <button :disabled="node.outputs.length === 0" @click="removeDynamicOutput">Remove Output</button>
            </template>
            <template v-else>
                <div class="inputs flex flex-col gap-1">
                    <template v-for="input in node.inputs" :key="`${node.id}:${input.name || input}`">
                        <ExecutionIOConnection
                            v-if="input.type === 'exec'"
                            :io="input"
                            :connection="getInputConnection(input)"
                            :node-id="node.id"
                            io-type="input"
                            @io-position="onIOPosition"
                        />
                        <InputIOConnection
                            v-else
                            :io="input"
                            :connection="getInputConnection(input)"
                            :node-id="node.id"
                            @io-position="onIOPosition"
                        />
                    </template>
                    <slot name="inputs"></slot>
                </div>

                <div class="outputs flex flex-col gap-1">
                    <template v-for="output in node.outputs" :key="`${node.id}:${output.name || output}`">
                        <ExecutionIOConnection
                            v-if="output.type === 'exec'"
                            :io="output"
                            :connection="getOutputConnection(output)"
                            :node-id="node.id"
                            io-type="output"
                            @io-position="onIOPosition"
                        />
                        <OutputIOConnection
                            v-else
                            :io="output"
                            :connection="getOutputConnection(output)"
                            :node-id="node.id"
                            @io-position="onIOPosition"
                        />
                    </template>
                    <slot name="outputs"></slot>
                </div>
            </template>
        </div>
        <slot name="footer"></slot>
    </div>
</template>

<script setup>
    import { computed, nextTick, onMounted, ref, watch, provide } from 'vue';
    import { construction } from '../../utils/node-interaction.js';
    import { getNodeColor } from '../../utils/node-colors.js';
    import { getCategoryInfo } from '../../utils/language-definition.js';
    import { getNodeIssues } from '../../utils/node-inspector.js';
    import { getConnections } from '../../utils/connection-manager.js';
    import { updateNodeOutputs } from '../../utils/system-node-utils.js';
    import NodeGlyph from '../icons/NodeGlyph.vue';
    import { getNodeExecutionStatus } from '../../utils/graph-executor.js';
    import { screenToWorld } from '../../utils/viewport-utils.js';
    import InputIOConnection from '../NodeParts/InputIOConnection.vue';
    import OutputIOConnection from '../NodeParts/OutputIOConnection.vue';
    import ExecutionIOConnection from '../NodeParts/ExecutionIOConnection.vue';
    import { registerIO } from '../../utils/io-utils.js';
    import { selectedNodeId, selectNode } from '../../utils/node-selection.js';

    const emit = defineEmits([
        'move',
        'connect',
        'register-io',
        'select',
        'start-connection-drag',
        'delete-connection',
        'node-context-menu',
        'update-outputs'
    ]);
    const props = defineProps({
        node: Object,
        connections: Array
    });

    const nodeRef = ref();
    const { registerAllIO, onIOContextMenu } = construction(emit, props, nodeRef);

    // Provide the onIOContextMenu function to child IO components
    provide('onIOContextMenu', onIOContextMenu);

    onMounted(() => {
        nextTick(() => {
            registerAllIO();
        });
    });

    watch(
        () => [props.node],
        () => {
            nextTick(registerAllIO);
        },
        { deep: true }
    );

    // Get connection for a specific input
    const getInputConnection = (inputName) => {
        if (!props.connections) return null;
        return (
            props.connections.find(
                (conn) =>
                    conn.to && conn.to.nodeId === props.node.id && (conn.to.input === inputName || conn.to.input === (inputName.name || inputName))
            ) || null
        );
    };

    // Get connection for a specific output
    const getOutputConnection = (outputName) => {
        if (!props.connections) return null;
        return (
            props.connections.find(
                (conn) =>
                    conn.from &&
                    conn.from.nodeId === props.node.id &&
                    (conn.from.output === outputName || conn.from.output === (outputName.name || outputName))
            ) || null
        );
    };

    // Get execution status for visual indicators
    const executionStatus = computed(() => getNodeExecutionStatus(props.node.id));

    const isSelected = computed(() => selectedNodeId.value === props.node.id);

    // The node's accent color name (e.g. 'red'/'violet'/'amber'), resolved from its
    // category. Drives the `.na-<color>` class that tints the header via --na.
    // An explicit per-node color/glyph wins (set by the lowering for generic nodes
    // it can classify — branches, operators, getters); otherwise fall back to the
    // node type / category (real definitions carry a category that colors them).
    const nodeColorName = computed(() => props.node.color || getNodeColor(props.node.type, props.node.nodeDefId) || 'blue');
    const glyphName = computed(() => props.node.glyph || getCategoryInfo(props.node.category)?.icon || props.node.type || '');

    // Validation issues on this node → warning badge.
    const nodeIssues = computed(() => getNodeIssues(props.node, { connections: props.connections || getConnections() }));
    const nodeHasError = computed(() => nodeIssues.value.some((i) => i.level === 'error'));

    // Execution status styling — a colored border after a run.
    const executionStatusClass = computed(() => {
        if (!executionStatus.value.executed) return '';
        if (executionStatus.value.success === false) return 'border-red-500';
        return 'border-green-500';
    });

    // Determine if this node should show a header
    const shouldShowHeader = computed(() => {
        // Variable nodes don't show headers
        if (props.node.type === 'variable') {
            return false;
        }

        // All other node types show headers
        return true;
    });

    // Get default header text for nodes
    const getDefaultHeaderText = () => {
        if (props.node.name) {
            return props.node.name;
        }

        if (props.node.nodeDefId) {
            return props.node.nodeDefId;
        }

        if (props.node.type === 'function') {
            return props.node.funcName || 'Function';
        }

        if (props.node.type === 'system') {
            return props.node.systemName || 'System';
        }

        return `Node ${props.node.id}`;
    };

    // Node dragging logic
    const dragging = ref(false);
    let dragOffset = null;
    const latestIOPositions = {};
    const lastWorldPositions = {};

    function onIOPosition({ type, name, rect }) {
        // Store the latest DOM rect for each IO
        if (!latestIOPositions[type]) latestIOPositions[type] = {};
        latestIOPositions[type][name] = rect;
    }

    function handleMouseDown(e) {
        if (e.button !== 0) return; // Only left mouse button
        // Defensive: Remove any existing listeners before adding new ones
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        dragging.value = true;
        const mouseWorld = screenToWorld(e.clientX, e.clientY);
        dragOffset = {
            x: mouseWorld.x - props.node.x,
            y: mouseWorld.y - props.node.y
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    function handleMouseMove(e) {
        if (!dragging.value) return;
        const mouseWorld = screenToWorld(e.clientX, e.clientY);
        const newX = mouseWorld.x - dragOffset.x;
        const newY = mouseWorld.y - dragOffset.y;
        emit('move', { id: props.node.id, x: newX, y: newY });

        // Register IOs with their true DOM positions (converted to world coordinates), but only if changed
        for (const type of ['input', 'output']) {
            if (latestIOPositions[type]) {
                for (const [name, rect] of Object.entries(latestIOPositions[type])) {
                    // Convert DOM rect center to world coordinates
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const world = screenToWorld(centerX, centerY);
                    const key = `${props.node.id}:${name}:${type}`;
                    const last = lastWorldPositions[key];
                    if (!last || last.x !== world.x || last.y !== world.y) {
                        lastWorldPositions[key] = { x: world.x, y: world.y };
                        registerIO({
                            nodeId: props.node.id,
                            type,
                            name,
                            x: world.x,
                            y: world.y
                        });
                    }
                }
            }
        }
    }

    function handleMouseUp() {
        dragging.value = false;
        dragOffset = null;
        // Always remove listeners, even if not dragging
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }

    function handleClick() {
        selectNode({ id: props.node.id });
        emit('select', props.node.id);
    }

    function handleNodeContextMenu(event) {
        // Emit the context menu event with the mouse position and node data
        emit('node-context-menu', {
            node: props.node,
            position: {
                x: event.clientX,
                y: event.clientY
            }
        });
    }

    function addDynamicOutput() {
        const current = props.node.outputs || [];
        const newOutput = { name: `Output ${current.length + 1}`, type: 'exec' };
        updateNodeOutputs(props.node.id, [...current, newOutput]);
    }

    function removeDynamicOutput() {
        const current = props.node.outputs || [];
        if (current.length > 0) {
            updateNodeOutputs(props.node.id, current.slice(0, -1));
        }
    }
</script>

<style scoped>
    button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
</style>
