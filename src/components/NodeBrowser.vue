<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click="handleOverlayClick">
        <div class="nb-modal flex max-h-[80vh] w-96 flex-col" @click.stop>
            <!-- Header -->
            <div class="nb-header flex items-center justify-between p-4">
                <h3 class="nb-title">Browse All Nodes</h3>
                <button class="nb-close" @click="$emit('close')">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                    </svg>
                </button>
            </div>

            <!-- Search -->
            <div class="bp-filter nb-filter">
                <input ref="searchInput" v-model="searchQuery" placeholder="Search nodes..." />
            </div>

            <!-- Node List -->
            <div class="flex-1 overflow-y-auto">
                <div v-for="category in filteredCategories" :key="category.key" class="nb-cat">
                    <div class="nb-cat-head" @click="toggleCategory(category.key)">
                        <div class="flex items-center gap-2">
                            <div :class="`bg-${category.color}-500`" class="h-2 w-2 rounded-full"></div>
                            <span>{{ category.name }}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="nb-count">{{ category.count }}</span>
                            <svg
                                :class="{ 'rotate-180': expandedCategories[category.key] }"
                                class="h-4 w-4 transition-transform"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                            </svg>
                        </div>
                    </div>

                    <div v-if="expandedCategories[category.key]" class="nb-cat-body">
                        <div v-for="node in category.nodes" :key="node.id" class="nb-node" @click="handleNodeSelect(node)">
                            <div class="flex items-center justify-between">
                                <span class="nb-node-name">{{ node.name }}</span>
                                <div :class="`bg-${category.color}-400`" class="h-2 w-2 rounded-full"></div>
                            </div>
                            <p class="nb-node-desc">{{ node.description }}</p>
                            <div class="nb-node-meta flex justify-between">
                                <span>{{ node.inputs?.length || 0 }} inputs</span>
                                <span>{{ node.outputs?.length || 0 }} outputs</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- No results -->
                <div v-if="filteredCategories.length === 0" class="nb-empty">No nodes found matching "{{ searchQuery }}"</div>
            </div>

            <!-- Footer -->
            <div class="nb-footer">Click on a node to add it at the right-click position</div>
        </div>
    </div>
</template>

<script setup>
    // Safety net: ensure listener is removed on unmount
    import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
    import { getAllNodeDefinitions, NODE_CATEGORIES } from '../utils/language-definition.js';

    const props = defineProps({
        visible: Boolean,
        position: {
            type: Object,
            default: () => ({ x: 0, y: 0 })
        }
    });

    const emit = defineEmits(['close', 'node-select']);

    const searchQuery = ref('');
    const expandedCategories = ref({});
    const searchInput = ref(null);

    // Focus search input when modal opens
    watch(
        () => props.visible,
        (newVisible) => {
            if (newVisible) {
                nextTick(() => {
                    if (searchInput.value) {
                        searchInput.value.focus();
                    }
                });
            }
        }
    );

    // Get all available nodes organized by category
    const allNodes = computed(() => {
        const nodes = getAllNodeDefinitions();
        const categorized = {};

        for (const [nodeId, nodeDef] of Object.entries(nodes)) {
            const categoryKey = nodeDef.categoryKey || 'OTHER';
            if (!categorized[categoryKey]) {
                categorized[categoryKey] = [];
            }
            categorized[categoryKey].push({
                id: nodeId,
                ...nodeDef
            });
        }

        return categorized;
    });

    // Filter and organize categories for display
    const filteredCategories = computed(() => {
        const query = searchQuery.value.toLowerCase();
        const categories = [];

        for (const [categoryKey, nodes] of Object.entries(allNodes.value)) {
            const categoryInfo = NODE_CATEGORIES[categoryKey.toUpperCase()] || {
                name: categoryKey,
                color: 'gray'
            };

            const filteredNodes = nodes.filter(
                (node) =>
                    node.name.toLowerCase().includes(query) ||
                    node.description?.toLowerCase().includes(query) ||
                    node.id.toLowerCase().includes(query)
            );

            if (filteredNodes.length > 0) {
                categories.push({
                    key: categoryKey,
                    name: categoryInfo.name,
                    color: categoryInfo.color,
                    count: filteredNodes.length,
                    nodes: filteredNodes.sort((a, b) => a.name.localeCompare(b.name))
                });
            }
        }

        return categories.sort((a, b) => a.name.localeCompare(b.name));
    });

    function toggleCategory(categoryKey) {
        expandedCategories.value[categoryKey] = !expandedCategories.value[categoryKey];
    }

    function handleNodeSelect(node) {
        emit('node-select', {
            nodeId: node.id,
            position: props.position
        });
        emit('close');
    }

    function handleOverlayClick() {
        emit('close');
    }

    // Handle escape key
    watch(
        () => props.visible,
        (newVisible) => {
            if (typeof window !== 'undefined' && window.document) {
                if (newVisible) {
                    window.document.addEventListener('keydown', handleKeyDown);
                } else {
                    window.document.removeEventListener('keydown', handleKeyDown);
                }
            }
        }
    );

    onUnmounted(() => {
        if (typeof window !== 'undefined' && window.document) {
            window.document.removeEventListener('keydown', handleKeyDown);
        }
    });

    function handleKeyDown(event) {
        if (event.key === 'Escape') {
            emit('close');
        }
    }
</script>

<style scoped>
    .nb-modal {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 12px;
        box-shadow:
            0 30px 60px -20px rgba(0, 0, 0, 0.8),
            0 0 0 1px rgba(0, 0, 0, 0.3);
        color: var(--ink);
        font-family: var(--font-ui);
        overflow: hidden;
    }
    .nb-header {
        border-bottom: 1px solid var(--line);
    }
    .nb-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--ink);
    }
    .nb-close {
        color: var(--ink-3);
        background: transparent;
        border: none;
        cursor: pointer;
    }
    .nb-close:hover {
        color: var(--ink);
    }
    .nb-filter {
        margin: 12px;
        border-bottom: none;
    }
    .nb-cat {
        border-bottom: 1px solid var(--line-soft);
    }
    .nb-cat:last-child {
        border-bottom: none;
    }
    .nb-cat-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        font-size: 13px;
        font-weight: 500;
        color: var(--ink-2);
        cursor: pointer;
    }
    .nb-cat-head:hover {
        background: var(--raised);
        color: var(--ink);
    }
    .nb-count {
        font-size: 11px;
        color: var(--ink-3);
    }
    .nb-cat-body {
        background: var(--panel-2);
    }
    .nb-node {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 10px 12px 10px 24px;
        border-left: 2px solid transparent;
        cursor: pointer;
    }
    .nb-node:hover {
        background: var(--raised);
        border-left-color: var(--accent);
    }
    .nb-node-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--ink);
    }
    .nb-node-desc {
        font-size: 11.5px;
        color: var(--ink-2);
    }
    .nb-node-meta {
        font-size: 11px;
        color: var(--ink-3);
    }
    .nb-empty {
        padding: 16px;
        text-align: center;
        font-size: 12.5px;
        color: var(--ink-3);
    }
    .nb-footer {
        padding: 12px 16px;
        border-top: 1px solid var(--line);
        font-size: 11px;
        color: var(--ink-3);
    }

    /* Custom scrollbar for the node list */
    .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: #4a5568 #2d3748;
    }

    .overflow-y-auto::-webkit-scrollbar {
        width: 6px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
        background: #2d3748;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
        background-color: #4a5568;
        border-radius: 3px;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
        background-color: #718096;
    }

    /* Smooth entrance animation */
    .fixed {
        animation: modalFadeIn 0.2s ease-out;
    }

    /* Keep slide-in on the modal container */
    .nb-modal {
        animation: modalSlideIn 0.2s ease-out;
    }

    @keyframes modalFadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes modalSlideIn {
        from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
</style>
