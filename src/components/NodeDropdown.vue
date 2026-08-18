<template>
    <div ref="dropdownRef" class="relative">
        <button class="bp-btn nd-trigger" @click="toggleDropdown">
            <span>{{ title }}</span>
            <svg :class="{ 'rotate-180': isOpen }" class="h-4 w-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
            </svg>
        </button>

        <div v-if="isOpen" class="nd-popup absolute top-full left-0 z-50 mt-1 w-64 overflow-hidden">
            <div class="bp-filter nd-filter">
                <input v-model="searchQuery" placeholder="Search nodes..." />
            </div>

            <div class="max-h-80 overflow-y-auto">
                <div v-for="category in filteredCategories" :key="category.key" class="nd-cat">
                    <div class="nd-cat-head" @click="toggleCategory(category.key)">
                        <div class="flex items-center gap-2">
                            <div :class="`bg-${category.color}-500`" class="h-2 w-2 rounded-full"></div>
                            <span>{{ category.name }}</span>
                        </div>
                        <span class="nd-count">{{ category.count }}</span>
                    </div>

                    <div v-if="expandedCategories[category.key]" class="nd-cat-body">
                        <div v-for="node in category.nodes" :key="node.id" class="nd-node" @click="$emit('node-select', node)">
                            <div class="min-w-0">
                                <div class="nd-node-name">{{ node.name }}</div>
                                <div class="nd-node-desc truncate">{{ node.description }}</div>
                            </div>
                            <div class="nd-node-meta">{{ node.inputs?.length || 0 }}→{{ node.outputs?.length || 0 }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed, onMounted, onUnmounted, ref } from 'vue';
    import { getNodePalette } from '../utils/node-factory.js';

    defineProps({
        title: { type: String, default: 'Add Node' }
    });

    defineEmits(['node-select']);

    const isOpen = ref(false);
    const searchQuery = ref('');
    const expandedCategories = ref({});
    const dropdownRef = ref(null);
    const nodePalette = ref({});

    onMounted(() => {
        nodePalette.value = getNodePalette();
        // In tests/SSR, document may not exist or may be torn down; guard usage
        if (typeof window !== 'undefined' && window.document) {
            window.document.addEventListener('click', handleClickOutside);
        }
    });

    onUnmounted(() => {
        if (typeof window !== 'undefined' && window.document) {
            window.document.removeEventListener('click', handleClickOutside);
        }
    });

    const filteredCategories = computed(() => {
        const query = searchQuery.value.toLowerCase();
        const categories = [];

        for (const [categoryKey, category] of Object.entries(nodePalette.value)) {
            let filteredNodes = category.nodes;

            if (query) {
                filteredNodes = category.nodes.filter(
                    (node) =>
                        node.name.toLowerCase().includes(query) ||
                        node.description.toLowerCase().includes(query) ||
                        node.id.toLowerCase().includes(query)
                );
            }

            if (filteredNodes.length > 0) {
                categories.push({
                    key: categoryKey,
                    name: category.name || categoryKey,
                    color: category.color || 'gray',
                    count: filteredNodes.length,
                    nodes: filteredNodes
                });
            }
        }

        return categories;
    });

    function toggleDropdown() {
        isOpen.value = !isOpen.value;
    }

    function toggleCategory(categoryKey) {
        expandedCategories.value[categoryKey] = !expandedCategories.value[categoryKey];
    }

    function handleClickOutside(event) {
        if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
            isOpen.value = false;
        }
    }
</script>

<style scoped>
    .nd-trigger {
        height: auto;
        padding: 8px 16px;
        font-size: 15px;
        color: var(--ink);
    }

    .nd-popup {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 10px;
        box-shadow:
            0 18px 40px -16px rgba(0, 0, 0, 0.75),
            0 0 0 1px rgba(0, 0, 0, 0.3);
        color: var(--ink);
        font-family: var(--font-ui);
    }
    .nd-filter {
        margin: 8px;
    }
    .nd-cat {
        border-bottom: 1px solid var(--line-soft);
    }
    .nd-cat:last-child {
        border-bottom: none;
    }
    .nd-cat-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px;
        font-size: 13px;
        font-weight: 500;
        color: var(--ink-2);
        cursor: pointer;
    }
    .nd-cat-head:hover {
        background: var(--raised);
        color: var(--ink);
    }
    .nd-count {
        font-size: 11px;
        color: var(--ink-3);
    }
    .nd-cat-body {
        background: var(--panel-2);
    }
    .nd-node {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 8px 8px 24px;
        cursor: pointer;
    }
    .nd-node:hover {
        background: var(--raised);
    }
    .nd-node-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--ink);
    }
    .nd-node-desc {
        font-size: 11px;
        color: var(--ink-3);
    }
    .nd-node-meta {
        font-size: 11px;
        color: var(--ink-3);
        flex: none;
    }
</style>
