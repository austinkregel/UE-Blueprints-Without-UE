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
        <!-- Variable nodes don't use custom headers - handled by NodeBase -->
    </NodeBase>
</template>

<script setup>
    import NodeBase from './NodeBase.vue';

    const emit = defineEmits(['move', 'connect', 'select', 'register-io', 'node-context-menu']);

    const { node, connections } = defineProps({
        node: Object,
        connections: Array
    });
</script>
