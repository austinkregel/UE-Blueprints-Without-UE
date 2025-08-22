<template>
    <div
        v-if="visible"
        :style="{ top: position.y + 'px', left: position.x + 'px' }"
        class="context-menu fixed z-50 max-w-md min-w-72 rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-600 dark:bg-zinc-800"
        @click.stop
    >
        <div class="py-2">
            <!-- Node Search & List -->
            <div class="px-3 py-1 text-xs font-semibold text-zinc-500 uppercase dark:text-zinc-400">All Nodes</div>
            <div class="px-3 pb-2">
                <input
                    v-model="searchQuery"
                    class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                    placeholder="Search nodes..."
                />
            </div>
            <div class="max-h-60 overflow-y-auto">
                <div
                    v-for="node in filteredNodes"
                    :key="node.id"
                    class="flex cursor-pointer flex-col gap-1 rounded px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    @click="handleNodeSelect(node)"
                >
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-zinc-900 dark:text-white">{{ node.name }}</span>
                        <span class="ml-2 text-xs text-zinc-500">{{ node.categoryName }}</span>
                    </div>
                    <p class="text-xs text-zinc-600 dark:text-zinc-400">{{ node.description }}</p>
                </div>
                <div v-if="filteredNodes.length === 0" class="p-4 text-center text-zinc-500 dark:text-zinc-400">
                    No nodes found matching "{{ searchQuery }}"
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed, watch } from 'vue';
    import { getAllNodeDefinitions, NODE_CATEGORIES } from '../utils/language-definition.js';

    const props = defineProps({
        visible: Boolean,
        position: {
            type: Object,
            default: () => ({ x: 0, y: 0 })
        }
    });

    const emit = defineEmits(['action', 'close', 'node-select']);

    function handleAction(actionType) {
        emit('action', {
            type: actionType,
            position: props.position
        });
        emit('close');
    }

    // Node search logic
    const searchQuery = ref('');
    const allNodes = computed(() => {
        // Flatten all nodes into a single array with category info
        const nodes = getAllNodeDefinitions();
        const result = [];
        for (const [nodeId, nodeDef] of Object.entries(nodes)) {
            result.push({
                id: nodeId,
                ...nodeDef,
                categoryName: NODE_CATEGORIES[nodeDef.categoryKey]?.name || 'Other'
            });
        }
        return result;
    });
    const filteredNodes = computed(() => {
        if (!searchQuery.value) return allNodes.value;
        const q = searchQuery.value.toLowerCase();
        return allNodes.value.filter(
            (node) =>
                node.name.toLowerCase().includes(q) || node.description?.toLowerCase().includes(q) || node.categoryName.toLowerCase().includes(q)
        );
    });

    function handleNodeSelect(node) {
        emit('node-select', { node, position: props.position });
        emit('close');
    }

    // Close when clicking outside or pressing escape
    watch(
        () => props.visible,
        (newVisible) => {
            if (newVisible) {
                // Add click listener to close menu when clicking outside
                setTimeout(() => {
                    document.addEventListener('click', handleOutsideClick);
                    document.addEventListener('keydown', handleKeyDown);
                }, 0);
            } else {
                document.removeEventListener('click', handleOutsideClick);
                document.removeEventListener('keydown', handleKeyDown);
            }
        }
    );

    function handleOutsideClick() {
        emit('close');
    }

    function handleKeyDown(event) {
        if (event.key === 'Escape') {
            emit('close');
        }
    }
</script>

<style scoped>
    .context-menu {
        /* Ensure the menu doesn't go off-screen */
        max-height: 80vh;
        overflow-y: auto;
    }

    /* Smooth entrance animation */
    .context-menu {
        animation: contextMenuSlide 0.15s ease-out;
    }

    @keyframes contextMenuSlide {
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
