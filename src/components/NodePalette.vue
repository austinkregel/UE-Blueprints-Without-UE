<template>
    <div class="node-palette h-full w-80 overflow-y-auto border-r border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div class="border-b border-zinc-200 p-4 dark:border-zinc-700">
            <h2 class="text-lg font-bold text-zinc-900 dark:text-white">Node Palette</h2>
            <input
                v-model="searchQuery"
                class="mt-2 w-full rounded border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                placeholder="Search nodes..."
            />
            <div class="mt-2 flex gap-2">
                <button class="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700" @click="scanProjectClick">Scan Project</button>
                <span v-if="scanStatus" class="text-xs text-zinc-500">{{ scanStatus }}</span>
            </div>
        </div>

        <div class="p-2">
            <div v-for="(category, categoryKey) in filteredPalette" :key="categoryKey" class="mb-4">
                <div
                    class="flex cursor-pointer items-center justify-between rounded p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    @click="toggleCategory(categoryKey)"
                >
                    <div class="flex items-center">
                        <div :class="`bg-${category.color}-500`" class="mr-2 h-3 w-3 rounded-full"></div>
                        <span class="font-medium text-zinc-900 dark:text-white">{{ category.name }}</span>
                    </div>
                    <span class="text-sm text-zinc-500 dark:text-zinc-400"> {{ category.nodes.length }} nodes </span>
                </div>

                <div v-if="expandedCategories[categoryKey]" class="mt-2 ml-4">
                    <div
                        v-for="node in category.nodes"
                        :key="node.id"
                        :draggable="true"
                        class="mb-2 cursor-grab rounded border border-zinc-200 bg-white p-2 transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
                        @click="onNodeSelect(node)"
                        @dragstart="onDragStart($event, node)"
                    >
                        <div class="mb-1 flex items-center justify-between">
                            <span class="text-sm font-medium text-zinc-900 dark:text-white">{{ node.name }}</span>
                            <div :class="`bg-${category.color}-400`" class="h-2 w-2 rounded-full"></div>
                        </div>

                        <p class="mb-2 text-xs text-zinc-600 dark:text-zinc-400">{{ node.description }}</p>

                        <div class="flex justify-between text-xs">
                            <div>
                                <span class="text-zinc-600 dark:text-zinc-500">In:</span>
                                <span class="ml-1 text-cyan-600 dark:text-cyan-400">{{ node.inputs?.length || 0 }}</span>
                            </div>
                            <div>
                                <span class="text-zinc-600 dark:text-zinc-500">Out:</span>
                                <span class="ml-1 text-pink-600 dark:text-pink-400">{{ node.outputs?.length || 0 }}</span>
                            </div>
                        </div>

                        <!-- Input/Output preview -->
                        <div v-if="showIOPreview" class="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
                            <div v-if="node.inputs?.length" class="mb-1">
                                <div class="mb-1 text-xs text-zinc-600 dark:text-zinc-500">Inputs:</div>
                                <div class="flex flex-wrap gap-1">
                                    <Type v-for="input in node.inputs" :key="input.name" :name="input.name" :type="input.type" />
                                </div>
                            </div>

                            <div v-if="node.outputs?.length">
                                <div class="mb-1 text-xs text-zinc-600 dark:text-zinc-500">Outputs:</div>
                                <div class="flex flex-wrap gap-1">
                                    <Type v-for="output in node.outputs" :key="output.name" :name="output.name" :type="output.type" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Toggle for IO preview -->
        <div class="border-t border-zinc-200 p-4 dark:border-zinc-700">
            <label class="flex items-center text-sm text-zinc-900 dark:text-white">
                <input v-model="showIOPreview" class="mr-2" type="checkbox" />
                Show I/O Details
            </label>
        </div>
    </div>
</template>

<script setup>
    import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import { getNodePalette } from '../utils/node-factory.js';
    import { loadLanguageDefinitionsFromUrl } from '../utils/language-spec-loader.js';
    import { pickDirectory } from '../utils/file-tree.js';
    import { scanProject } from '../utils/project-indexer.js';
    import Type from './Type.vue';

    const emit = defineEmits(['node-drag-start', 'node-select']);

    const searchQuery = ref('');
    const showIOPreview = ref(false);
    const expandedCategories = ref({});
    const nodePalette = ref({});
    const scanStatus = ref('');

    function refreshPalette() {
        nodePalette.value = getNodePalette();
        for (const categoryKey of Object.keys(nodePalette.value)) {
            if (expandedCategories.value[categoryKey] === undefined) expandedCategories.value[categoryKey] = true;
        }
    }

    let defsListener = null;

    onMounted(async () => {
        try {
            await loadLanguageDefinitionsFromUrl('/language-extras.json');
        } catch {}
        refreshPalette();
        defsListener = () => refreshPalette();
        try {
            window.addEventListener('language-definitions-updated', defsListener);
        } catch {}
    });

    onBeforeUnmount(() => {
        try {
            if (defsListener) window.removeEventListener('language-definitions-updated', defsListener);
        } catch {}
    });

    const filteredPalette = computed(() => {
        if (!searchQuery.value) {
            return nodePalette.value;
        }

        const query = searchQuery.value.toLowerCase();
        const filtered = {};

        for (const [categoryKey, category] of Object.entries(nodePalette.value)) {
            const filteredNodes = category.nodes.filter(
                (node) =>
                    node.name.toLowerCase().includes(query) || node.description.toLowerCase().includes(query) || node.id.toLowerCase().includes(query)
            );

            if (filteredNodes.length > 0) {
                filtered[categoryKey] = {
                    ...category,
                    nodes: filteredNodes
                };
            }
        }

        return filtered;
    });

    function toggleCategory(categoryKey) {
        expandedCategories.value[categoryKey] = !expandedCategories.value[categoryKey];
    }

    function onDragStart(event, node) {
        event.dataTransfer.setData(
            'application/json',
            JSON.stringify({
                type: 'node-palette-item',
                nodeDefId: node.id,
                nodeName: node.name
            })
        );

        emit('node-drag-start', { node, event });
    }

    function onNodeSelect(node) {
        emit('node-select', node);
    }

    async function scanProjectClick() {
        try {
            scanStatus.value = 'Picking…';
            const dir = await pickDirectory();
            if (!dir) {
                scanStatus.value = 'Canceled';
                return;
            }
            scanStatus.value = 'Scanning…';
            await scanProject(dir, {
                onProgress: (p) => {
                    scanStatus.value = `Scanning ${p.processed}/${p.total || '?'}…`;
                }
            });
            // The indexer registers nodes and emits update event; refresh locally just in case
            refreshPalette();
            scanStatus.value = 'Done';
            setTimeout(() => {
                scanStatus.value = '';
            }, 1500);
        } catch (e) {
            scanStatus.value = 'Failed';
            setTimeout(() => {
                scanStatus.value = '';
            }, 2000);
        }
    }
</script>

<style scoped>
    /* Custom scrollbar styling - keeping as Tailwind doesn't have direct equivalents */
    .node-palette {
        scrollbar-width: thin;
        scrollbar-color: #4a5568 #2d3748;
    }

    .node-palette::-webkit-scrollbar {
        width: 8px;
    }

    .node-palette::-webkit-scrollbar-track {
        background: #2d3748;
    }

    .node-palette::-webkit-scrollbar-thumb {
        background: #4a5568;
        border-radius: 4px;
    }

    .node-palette::-webkit-scrollbar-thumb:hover {
        background: #718096;
    }

    /* Drag styling using raw CSS instead of Tailwind @apply */
    [draggable='true']:active {
        cursor: grabbing;
        transform: scale(0.95);
        opacity: 0.8;
    }

    [draggable='true']:hover {
        box-shadow:
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 8px 10px -6px rgba(0, 0, 0, 0.1);
    }
</style>
