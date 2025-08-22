<template>
    <div class="flex flex-wrap items-center relative gap-2 px-4 py-2">
        <!-- View menu -->
        <DropdownMenu buttonClass="bg-gray-700 hover:bg-gray-800" label="View" widthClass="w-56">
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('toggle-palette')"
                >
                    {{ showNodePalette ? 'Hide' : 'Show' }} Palette
                </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('toggle-debug')"
                >
                    {{ debugMode ? 'Disable Debug' : 'Enable Debug' }}
                </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('reset-viewport')"
                >
                    Reset View
                </button>
            </MenuItem>
        </DropdownMenu>

        <!-- Graph menu -->
        <DropdownMenu buttonClass="bg-green-700 hover:bg-green-800" label="Graph" widthClass="w-64">
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    :disabled="isExecuting"
                    class="w-full px-3 py-1.5 text-left text-sm disabled:opacity-50"
                    @click="$emit('run-graph')"
                >
                    Run Graph
                </button>
            </MenuItem>
            <MenuItem v-if="isExecuting" v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('stop-execution')"
                >
                    Stop
                </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('clear-results')"
                >
                    Clear Results
                </button>
            </MenuItem>
            <div class="my-1 border-t border-zinc-200 dark:border-zinc-700"></div>
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('create-test-graph')"
                >
                    Create Test Graph
                </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('open-entry-points')"
                >
                    Entry Points
                </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('open-events')"
                >
                    Events
                </button>
            </MenuItem>
        </DropdownMenu>

        <!-- Project menu -->
        <DropdownMenu buttonClass="bg-emerald-700 hover:bg-emerald-800" label="Project" widthClass="w-56">
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('open-project')"
                >
                    Open Project
                </button>
            </MenuItem>
        </DropdownMenu>

        <!-- Keep Node add dropdown accessible -->
        <NodeDropdown title="Add Node" @node-select="onNodeSelect" />

        <div class="ml-auto flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300">
            <span>Right-click + drag to pan | Mouse wheel to zoom</span>
            <span v-if="debugMode">X: {{ Math.round(viewport.x) }}, Y: {{ Math.round(viewport.y) }}, Zoom: {{ viewport.zoom.toFixed(2) }}</span>
            <span v-if="executionSummary?.isComplete || isExecuting" class="text-xs">
                <span v-if="executionSummary?.isComplete && executionSummary?.errors === 0" class="text-green-600 dark:text-green-400"
                    >✅ {{ executionSummary.executedNodes }}/{{ executionSummary.totalNodes }}</span
                >
                <span v-else-if="executionSummary?.isComplete && executionSummary?.errors > 0" class="text-yellow-600 dark:text-yellow-400"
                    >⚠️ {{ executionSummary.executedNodes }}/{{ executionSummary.totalNodes }} ({{ executionSummary.errors }} errors)</span
                >
                <span v-else-if="isExecuting" class="text-blue-600 dark:text-blue-400">🔄 {{ executionSummary?.executedNodes }} done</span>
            </span>
        </div>
    </div>
</template>

<script setup>
    import { defineAsyncComponent, defineEmits, defineProps } from 'vue';
    import { MenuItem } from '@headlessui/vue';
    import DropdownMenu from './DropdownMenu.vue';

    const props = defineProps({
        showNodePalette: { type: Boolean, default: true },
        debugMode: { type: Boolean, default: false },
        isExecuting: { type: Boolean, default: false },
        viewport: { type: Object, required: true },
        executionSummary: { type: Object, required: true }
    });

    const emit = defineEmits([
        'toggle-palette',
        'toggle-debug',
        'reset-viewport',
        'run-graph',
        'stop-execution',
        'clear-results',
        'create-test-graph',
        'open-entry-points',
        'open-events',
        'add-node-from-dropdown',
        'open-project'
    ]);

    const NodeDropdown = defineAsyncComponent(() => import('../NodeDropdown.vue'));

    function onNodeSelect(node) {
        emit('add-node-from-dropdown', node.id);
    }
</script>
