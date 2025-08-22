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
    </NodeBase>
</template>

<script setup>
    import NodeBase from './NodeBase.vue';

    const emit = defineEmits(['move', 'connect', 'select', 'register-io', 'node-context-menu']);

    const { node, connections } = defineProps({
        node: { type: Object, required: true },
        connections: { type: Array, default: () => [] }
    });
</script>

<style scoped>
    /* You can add custom styles for system nodes here */
</style>
