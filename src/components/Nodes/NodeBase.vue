<template>
    <div
        ref="nodeRef"
        :class="[
            colorClasses.border,
            colorClasses.shadow,
            executionStatusClass,
            'absolute inline-block max-w-[420px] min-w-[220px] cursor-grab border-2 font-sans text-sm text-white select-none',
            'bg-gradient-to-br from-slate-600/70 via-slate-700/90 to-slate-800/80',
            'rounded-[18px] shadow-lg shadow-black/25 backdrop-blur-sm',
            !dragging.value ? '' : '',
            'hover:shadow-xl hover:shadow-black/35',
            'active:shadow-md active:shadow-black/35'
        ]"
        :data-node-id="node.id"
        :style="{ left: node.x + 'px', top: node.y + 'px' }"
        @mousedown.stop="handleMouseDown"
        @click.stop="handleClick"
        @contextmenu.stop.prevent="handleNodeContextMenu"
    >
        <div
            v-if="shouldShowHeader"
            :class="[colorClasses.header, 'relative z-10 flex items-center justify-between rounded-t-[16px] bg-gradient-to-r px-3 py-1.5 font-bold']"
        >
            <slot name="header">{{ getDefaultHeaderText() }}</slot>
            <div v-if="executionStatus.executed" class="ml-2 text-xs">
                <span v-if="executionStatus.success === false" class="text-red-300">❌</span>
                <span v-else class="text-green-300">✅</span>
            </div>
        </div>
        <slot></slot>
        <div class="relative z-10 flex flex-wrap justify-between p-2">
            <!-- Variable nodes: Special compact layout -->
            <div v-if="props.node.type === 'variable'" class="flex w-full items-end justify-end">
                <ExecutionIOConnection
                    v-if="props.node.varType === 'exec'"
                    :io="{ name: props.node.outputs?.[0]?.name || props.node.varName, type: props.node.varType || 'mixed' }"
                    :connection="getOutputConnection(props.node.varName)"
                    :node-id="props.node.id"
                    io-type="output"
                    class="bg-zinc-700/50 text-sm hover:bg-zinc-600/50"
                    @io-position="onIOPosition"
                />
                <OutputIOConnection
                    v-else
                    :io="{ name: props.node.outputs?.[0]?.name || props.node.varName, type: props.node.varType || 'mixed' }"
                    :connection="getOutputConnection(props.node.varName)"
                    :node-id="props.node.id"
                    class="bg-zinc-700/50 text-sm hover:bg-zinc-600/50"
                    @io-position="onIOPosition"
                />
            </div>

            <!-- Regular nodes: Standard input/output layout -->
            <template v-else>
                <div class="inputs flex flex-col gap-1">
                    <template v-for="input in node.inputs" :key="`${props.node.id}:${input.name || input}`">
                        <ExecutionIOConnection
                            v-if="input.type === 'exec'"
                            :io="input"
                            :connection="getInputConnection(input)"
                            :node-id="props.node.id"
                            io-type="input"
                            @io-position="onIOPosition"
                        />
                        <InputIOConnection
                            v-else
                            :io="input"
                            :connection="getInputConnection(input)"
                            :node-id="props.node.id"
                            @io-position="onIOPosition"
                        />
                    </template>
                    <slot name="inputs"></slot>
                </div>

                <div class="outputs flex flex-col gap-1">
                    <template v-for="output in node.outputs" :key="`${props.node.id}:${output.name || output}`">
                        <ExecutionIOConnection
                            v-if="output.type === 'exec'"
                            :io="output"
                            :connection="getOutputConnection(output)"
                            :node-id="props.node.id"
                            io-type="output"
                            @io-position="onIOPosition"
                        />
                        <OutputIOConnection
                            v-else
                            :io="output"
                            :connection="getOutputConnection(output)"
                            :node-id="props.node.id"
                            @io-position="onIOPosition"
                        />
                    </template>
                    <slot name="outputs"></slot>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup>
    import { computed, nextTick, onMounted, ref, watch, provide } from 'vue';
    import { construction } from '../../utils/node-interaction.js';
    import { getNodeColor } from '../../utils/node-colors.js';
    import { getNodeExecutionStatus } from '../../utils/graph-executor.js';
    import { screenToWorld } from '../../utils/viewport-utils.js';
    import InputIOConnection from '../NodeParts/InputIOConnection.vue';
    import OutputIOConnection from '../NodeParts/OutputIOConnection.vue';
    import ExecutionIOConnection from '../NodeParts/ExecutionIOConnection.vue';
    import { registerIO } from '../../utils/io-utils.js';
    import { selectedNodeId, selectNode } from '../../utils/node-selection.js';

    const emit = defineEmits(['move', 'connect', 'register-io', 'select', 'start-connection-drag', 'delete-connection', 'node-context-menu']);
    const props = defineProps({
        node: Object,
        connections: Array
    });

    const nodeRef = ref();
    const { registerAllIO, startDrag, onIOContextMenu } = construction(emit, props, nodeRef);

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

    // Color mappings for different node types, with selection override
    const colorClasses = computed(() => {
        // Get the color for this specific node using our coloring system
        const nodeColor = getNodeColor(props.node.type, props.node.nodeDefId);
        const colorMap = {
            blue: {
                header: 'from-blue-500 to-blue-700',
                border: 'border-blue-400/30',
                shadow: 'shadow-blue-500/20'
            },
            green: {
                header: 'from-green-500 to-green-700',
                border: 'border-green-400/30',
                shadow: 'shadow-green-500/20'
            },
            yellow: {
                header: 'from-yellow-500 to-yellow-700',
                border: 'border-yellow-400/30',
                shadow: 'shadow-yellow-500/20'
            },
            purple: {
                header: 'from-purple-500 to-purple-700',
                border: 'border-purple-400/30',
                shadow: 'shadow-purple-500/20'
            },
            red: {
                header: 'from-red-500 to-red-700',
                border: 'border-red-400/30',
                shadow: 'shadow-red-500/20'
            },
            cyan: {
                header: 'from-cyan-500 to-cyan-700',
                border: 'border-cyan-400/30',
                shadow: 'shadow-cyan-500/20'
            },
            pink: {
                header: 'from-pink-500 to-pink-700',
                border: 'border-pink-400/30',
                shadow: 'shadow-pink-500/20'
            },
            orange: {
                header: 'from-orange-500 to-orange-700',
                border: 'border-orange-400/30',
                shadow: 'shadow-orange-500/20'
            },
            gray: {
                header: 'from-gray-500 to-gray-700',
                border: 'border-gray-400/30',
                shadow: 'shadow-gray-500/20'
            }
        };
        // If selected, override border with a strong blue ring and border
        if (isSelected.value) {
            return {
                ...colorMap[nodeColor],
                border: 'ring-4 ring-blue-400 border-blue-400 z-20',
            };
        }
        return colorMap[nodeColor] || colorMap.blue;
    });

    // Execution status styling
    const executionStatusClass = computed(() => {
        if (!executionStatus.value.executed) return '';

        if (executionStatus.value.success === false) {
            return 'border-red-500 shadow-red-500/30';
        } else if (executionStatus.value.executed) {
            return 'border-green-500 shadow-green-500/30';
        }

        return '';
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
</script>

<style scoped>
</style>
