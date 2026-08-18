<template>
    <div ref="pinRef">
        <ConnectionPin
            :io="io"
            :connection="connection"
            :node-id="nodeId"
            io-type="output"
            pin-type="data"
            @io-context-menu="$emit('io-context-menu', $event)"
        />
    </div>
</template>

<script setup>
    import { ref, watch, nextTick } from 'vue';
    import ConnectionPin from './ConnectionPin.vue';

    const { io, connection, nodeId } = defineProps({
        io: {
            type: [Object, String],
            required: true
        },
        connection: {
            type: Object,
            default: null
        },
        nodeId: {
            type: String,
            required: true
        }
    });

    const emit = defineEmits(['io-context-menu', 'io-position']);
    const pinRef = ref(null);
    const lastRect = ref(null);

    function rectEquals(a, b) {
        if (!a || !b) return false;
        return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
    }

    function emitPosition() {
        nextTick(() => {
            if (pinRef.value) {
                const rect = pinRef.value.getBoundingClientRect();
                if (!rectEquals(rect, lastRect.value)) {
                    lastRect.value = { ...rect };
                    // Add detailed log
                    emit('io-position', {
                        type: 'output',
                        name: io.name || io,
                        nodeId: nodeId,
                        rect
                    });
                }
            }
        });
    }

    // Remove onMounted, rely on watcher (it fires on mount)
    watch(
        () => [io.name || io, nodeId],
        () => emitPosition()
    );
</script>
