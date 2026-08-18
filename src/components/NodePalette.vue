<template>
    <div class="node-palette h-full overflow-y-auto bg-[var(--panel)] text-[var(--ink)]">
        <div class="bp-panel-head flex-col items-stretch gap-3">
            <h2 class="bp-sec-label">Node Palette</h2>
            <div class="bp-filter !m-0">
                <input v-model="searchQuery" placeholder="Search nodes..." />
            </div>
            <div class="flex items-center gap-2">
                <button class="bp-btn primary" @click="scanProjectClick">Scan Project</button>
                <span v-if="scanStatus" class="text-xs text-[var(--ink-3)]">{{ scanStatus }}</span>
            </div>
        </div>

        <div class="p-2">
            <div v-for="(category, categoryKey) in filteredPalette" :key="categoryKey" class="mb-4">
                <div class="bp-row justify-between" @click="toggleCategory(categoryKey)">
                    <div class="flex items-center">
                        <div :class="`bg-${category.color}-500`" class="mr-2 h-3 w-3 rounded-full"></div>
                        <span class="bp-sec-label !text-[var(--ink)]">{{ category.name }}</span>
                    </div>
                    <span class="text-xs text-[var(--ink-3)]"> {{ category.nodes.length }} nodes </span>
                </div>

                <div v-if="expandedCategories[categoryKey]" class="mt-2 ml-4">
                    <div
                        v-for="node in category.nodes"
                        :key="node.id"
                        :draggable="true"
                        class="palette-node mb-2 cursor-grab rounded-md border border-[var(--line)] bg-[var(--raised)] p-2 transition-all duration-200 hover:border-[var(--accent-dim)]"
                        @click="onNodeSelect(node)"
                        @dragstart="onDragStart($event, node)"
                    >
                        <div class="mb-1 flex items-center justify-between">
                            <span class="text-sm font-medium text-[var(--ink)]">{{ node.name }}</span>
                            <div :class="`bg-${category.color}-400`" class="h-2 w-2 rounded-full"></div>
                        </div>

                        <p class="mb-2 text-xs text-[var(--ink-3)]">{{ node.description }}</p>

                        <div class="flex justify-between text-xs">
                            <div>
                                <span class="text-[var(--ink-3)]">In:</span>
                                <span class="ml-1 text-cyan-400">{{ node.inputs?.length || 0 }}</span>
                            </div>
                            <div>
                                <span class="text-[var(--ink-3)]">Out:</span>
                                <span class="ml-1 text-pink-400">{{ node.outputs?.length || 0 }}</span>
                            </div>
                        </div>

                        <!-- Input/Output preview -->
                        <div v-if="showIOPreview" class="mt-2 border-t border-[var(--line)] pt-2">
                            <div v-if="node.inputs?.length" class="mb-1">
                                <div class="mb-1 text-xs text-[var(--ink-3)]">Inputs:</div>
                                <div class="flex flex-wrap gap-1">
                                    <Type v-for="input in node.inputs" :key="input.name" :name="input.name" :type="input.type" />
                                </div>
                            </div>

                            <div v-if="node.outputs?.length">
                                <div class="mb-1 text-xs text-[var(--ink-3)]">Outputs:</div>
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
        <div class="border-t border-[var(--line)] p-4">
            <label class="flex items-center text-sm text-[var(--ink-2)]">
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
        } catch {
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
