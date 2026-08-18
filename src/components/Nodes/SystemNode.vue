<template>
    <NodeBase
        :connections="connections"
        :node="node"
        @connect="$emit('connect', $event)"
        @move="$emit('move', $event)"
        @select="$emit('select', $event)"
        @register-io="$emit('register-io', $event)"
        @node-context-menu="$emit('node-context-menu', $event)"
    >
        <template #header>
            {{ node.name || node.systemName || node.nodeDefId || 'System' }}
        </template>
        <template #footer>
            <div class="mx-4 mb-2 flex justify-end">
                <button class="flex items-center gap-1 bg-none text-[10px]" @click="addOutput">
                    <PlusIcon class="inline h-3 w-3" />
                    <span>Add pin</span>
                </button>
            </div>
        </template>
    </NodeBase>
</template>

<script setup>
    import NodeBase from './NodeBase.vue';
    import { PlusIcon } from '@heroicons/vue/24/outline';

    const emit = defineEmits(['move', 'connect', 'select', 'register-io', 'node-context-menu', 'update-outputs']);

    const { node, connections } = defineProps({
        node: { type: Object, required: true },
        connections: { type: Array, default: () => [] }
    });

    function addOutput() {
        const current = node.outputs || [];
        const newOutput = { id: `output-${current.length + 1}`, name: `Output ${current.length + 1}`, type: 'string' };
        // Emit a fresh array to the parent instead of mutating the prop directly.
        emit('update-outputs', node.id, [...current, newOutput]);
    }
</script>

<style scoped>
    button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
</style>
