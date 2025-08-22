<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60">
        <div class="flex max-h-96 w-96 flex-col rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-700">
                <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">Entry Points</h3>
                <button class="text-zinc-400 hover:text-zinc-700 dark:hover:text-white" @click="$emit('close')">×</button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-4">
                <!-- Current Entry Points -->
                <div class="mb-4">
                    <h4 class="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Configured Entry Points</h4>
                    <div v-if="entryPoints.length === 0" class="text-sm text-zinc-500">
                        No entry points configured. Select nodes below to add them.
                    </div>
                    <div v-else class="space-y-2">
                        <div
                            v-for="nodeId in entryPoints"
                            :key="nodeId"
                            class="flex items-center justify-between rounded border border-zinc-200 bg-zinc-100 p-2 dark:border-zinc-600 dark:bg-zinc-700"
                        >
                            <div class="flex-1">
                                <div class="text-sm font-medium text-zinc-900 dark:text-white">
                                    {{ getNodeDisplayName(nodeId) }}
                                </div>
                                <div class="text-xs text-zinc-500 dark:text-zinc-400">ID: {{ nodeId }}</div>
                            </div>
                            <div class="flex gap-2">
                                <button
                                    :disabled="isExecuting"
                                    class="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                                    @click="executeFromNode(nodeId)"
                                >
                                    Run
                                </button>
                                <button class="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700" @click="removeEntryPoint(nodeId)">
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Available Nodes -->
                <div>
                    <h4 class="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Available Nodes</h4>
                    <div class="max-h-40 space-y-1 overflow-y-auto">
                        <div
                            v-for="node in availableNodes"
                            :key="node.id"
                            class="flex items-center justify-between rounded border border-zinc-200 bg-zinc-50 p-2 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-700"
                        >
                            <div class="flex-1">
                                <div class="text-sm text-zinc-900 dark:text-white">
                                    {{ node.nodeDefId || node.type || 'Unknown' }}
                                </div>
                                <div class="text-xs text-zinc-500 dark:text-zinc-400">ID: {{ node.id }}</div>
                            </div>
                            <button
                                :disabled="isEntryPoint(node.id)"
                                class="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-600"
                                @click="addEntryPoint(node.id)"
                            >
                                {{ isEntryPoint(node.id) ? 'Added' : 'Add' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="flex gap-2 border-t border-zinc-200 p-4 dark:border-zinc-700">
                <button
                    :disabled="entryPoints.length === 0"
                    class="rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                    @click="clearAllEntryPoints"
                >
                    Clear All
                </button>
                <button
                    :disabled="entryPoints.length === 0 || isExecuting"
                    class="rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                    @click="runAllEntryPoints"
                >
                    Run All
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed } from 'vue';
    import { nodes } from '../utils/state.js';
    import {
        addEntryPoint as addEntryPointToConfig,
        clearEntryPoints,
        configuredEntryPoints,
        executeFromEntryPoint,
        executeGraph,
        isEntryPoint as checkIsEntryPoint,
        isExecuting,
        removeEntryPoint as removeEntryPointFromConfig
    } from '../utils/graph-executor.js';

    const emit = defineEmits(['close']);

    defineProps({
        visible: Boolean
    });

    // Computed properties
    const entryPoints = computed(() => Array.from(configuredEntryPoints.value));

    const availableNodes = computed(() => {
        return nodes.value.filter((node) => {
            // Show all nodes that can potentially be entry points
            // Function nodes, system nodes, or nodes with exec outputs
            const hasExecOutput = node.outputs?.some((output) => output.type === 'exec');
            const isFunction = node.type === 'function';
            const isSystem = node.type === 'system';

            return hasExecOutput || isFunction || isSystem;
        });
    });

    // Helper functions
    function getNodeDisplayName(nodeId) {
        const node = nodes.value.find((n) => n.id === nodeId);
        if (!node) return 'Unknown Node';

        return node.name || node.nodeDefId || node.funcName || node.systemName || node.type || 'Unknown';
    }

    function addEntryPoint(nodeId) {
        addEntryPointToConfig(nodeId);
    }

    function removeEntryPoint(nodeId) {
        removeEntryPointFromConfig(nodeId);
    }

    function isEntryPoint(nodeId) {
        return checkIsEntryPoint(nodeId);
    }

    function clearAllEntryPoints() {
        clearEntryPoints();
    }

    async function executeFromNode(nodeId) {
        try {
            await executeFromEntryPoint(nodeId);
        } catch (error) {
            console.error('Failed to execute from entry point:', error);
        }
    }

    async function runAllEntryPoints() {
        try {
            await executeGraph();
        } catch (error) {
            console.error('Failed to execute graph:', error);
        }
    }
</script>
