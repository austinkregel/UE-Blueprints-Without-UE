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
              <button @click="addOutput" class="bg-none text-[10px] flex items-center gap-1">
                <PlusIcon class="h-3 w-3 inline" />
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
        const newOutput = { id: `output-${node.outputs.length + 1}`, name: `Output ${node.outputs.length + 1}`, type: 'string' };
        node.outputs.push(newOutput);
        emit('update-outputs', node.outputs);
    }

    function removeOutput() {
        if (node.outputs.length > 0) {
            node.outputs.pop();
            emit('update-outputs', node.outputs);
        }
    }
</script>

<style scoped>
    button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
</style>
