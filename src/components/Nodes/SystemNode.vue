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
            <div class="mx-4 mb-2 flex justify-end gap-2">
                <button class="flex items-center gap-1 bg-none text-[10px]" @click="addOutput">
                    <PlusIcon class="inline h-3 w-3" />
                    <span>Add pin</span>
                </button>
                <button v-if="removablePins" class="flex items-center gap-1 bg-none text-[10px] opacity-70" @click="removeOutput">
                    <MinusIcon class="inline h-3 w-3" />
                    <span>Remove</span>
                </button>
            </div>
        </template>
    </NodeBase>
</template>

<script setup>
    import { computed } from 'vue';
    import NodeBase from './NodeBase.vue';
    import { PlusIcon, MinusIcon } from '@heroicons/vue/24/outline';
    import { updateNodeOutputs } from '../../utils/system-node-utils.js';

    defineEmits(['move', 'connect', 'select', 'register-io', 'node-context-menu', 'update-outputs']);

    const { node, connections } = defineProps({
        node: { type: Object, required: true },
        connections: { type: Array, default: () => [] }
    });

    // Only the pins added here are removable (never the definition's own pins).
    const removablePins = computed(() => (node.outputs || []).some((o) => o && typeof o.id === 'string' && o.id.startsWith('output-')));

    function addOutput() {
        const current = node.outputs || [];
        const newOutput = { id: `output-${current.length + 1}`, name: `Output ${current.length + 1}`, type: 'string' };
        updateNodeOutputs(node.id, [...current, newOutput]);
    }

    function removeOutput() {
        const current = node.outputs || [];
        // Remove the last dynamically-added pin.
        for (let i = current.length - 1; i >= 0; i--) {
            if (current[i] && typeof current[i].id === 'string' && current[i].id.startsWith('output-')) {
                updateNodeOutputs(
                    node.id,
                    current.filter((_, idx) => idx !== i)
                );
                return;
            }
        }
    }
</script>

<style scoped>
    button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
</style>
