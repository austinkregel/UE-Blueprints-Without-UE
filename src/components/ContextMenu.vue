<template>
    <div
        v-if="visible"
        :style="{ top: position.y + 'px', left: position.x + 'px' }"
        class="context-menu bp-popup fixed z-50 max-w-md min-w-72"
        @click.stop
    >
        <div class="py-2">
            <!-- Node Search & List -->
            <div class="bp-sec-label px-3 py-1">All Nodes</div>
            <div class="bp-filter cm-filter">
                <input v-model="searchQuery" placeholder="Search nodes..." />
            </div>
            <div class="max-h-60 overflow-y-auto px-2">
                <div v-for="node in filteredNodes" :key="node.id" class="bp-row cm-node-row" @click="handleNodeSelect(node)">
                    <div class="cm-node-main">
                        <div class="flex items-center justify-between">
                            <span class="cm-node-name">{{ node.name }}</span>
                            <span class="cm-node-cat">{{ node.categoryName }}</span>
                        </div>
                        <p class="cm-node-desc">{{ node.description }}</p>
                    </div>
                </div>
                <div v-if="filteredNodes.length === 0" class="cm-empty">No nodes found matching "{{ searchQuery }}"</div>
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
        console.log({
            node,
            position: props.position
        });
        emit('node-select', { node, position: props.position });
        emit('close');
    }

    // Close when clicking outside or pressing escape
    watch(
        () => props.visible,
        (newVisible) => {
            if (newVisible) {
                // Add click listener to close menu when clicking outside
                document.addEventListener('click', handleOutsideClick);
                document.addEventListener('keydown', handleKeyDown);
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
    .bp-popup {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 10px;
        box-shadow:
            0 18px 40px -16px rgba(0, 0, 0, 0.75),
            0 0 0 1px rgba(0, 0, 0, 0.3);
        color: var(--ink);
        font-family: var(--font-ui);
    }

    .context-menu {
        /* Ensure the menu doesn't go off-screen */
        max-height: 80vh;
        overflow-y: auto;
    }

    /* Smooth entrance animation */
    .context-menu {
        animation: contextMenuSlide 0.15s ease-out;
    }

    .cm-filter {
        margin: 6px 8px 8px;
    }

    .cm-node-row {
        align-items: stretch;
        padding: 6px 8px;
    }

    .cm-node-main {
        display: flex;
        flex-direction: column;
        gap: 2px;
        width: 100%;
        min-width: 0;
    }

    .cm-node-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--ink);
    }

    .cm-node-cat {
        margin-left: 8px;
        font-size: 11px;
        color: var(--ink-3);
    }

    .cm-node-desc {
        font-size: 11.5px;
        color: var(--ink-2);
    }

    .cm-empty {
        padding: 16px;
        text-align: center;
        color: var(--ink-3);
        font-size: 12.5px;
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
