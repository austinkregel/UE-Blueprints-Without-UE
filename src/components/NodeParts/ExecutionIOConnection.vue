<template>
    <div ref="pinRef">
        <ConnectionPin
            :io="io"
            :connection="connection"
            :node-id="nodeId"
            :io-type="ioType"
            pin-type="exec"
            custom-classes="bg-gradient-to-r from-yellow-400/10 to-yellow-400/5 rounded hover:from-yellow-400/20 hover:to-yellow-400/10"
            label-classes="text-yellow-400 font-semibold"
            @io-context-menu="$emit('io-context-menu', $event)"
        />
    </div>
</template>

<script setup>
    import { ref, watch, nextTick } from 'vue';
    import ConnectionPin from './ConnectionPin.vue';

    const { io, connection, nodeId, ioType } = defineProps({
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
        },
        ioType: {
            type: String,
            required: true,
            validator: (value) => ['input', 'output'].includes(value)
        }
    });

    const emit = defineEmits(['io-context-menu', 'io-position']);
    const pinRef = ref(null);
    const lastRect = ref(null);

    function rectEquals(a, b) {
        if (!a || !b) return false;
        return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
    }

    function emitPosition(source = 'watch') {
        nextTick(() => {
            if (pinRef.value) {
                const rect = pinRef.value.getBoundingClientRect();
                if (!rectEquals(rect, lastRect.value)) {
                    lastRect.value = { ...rect };
                    // Add detailed log
                    emit('io-position', {
                        type: ioType,
                        name: io.name || io,
                        nodeId: nodeId,
                        rect
                    });
                }
            }
        });
    }

    watch(
        () => [io.name || io, nodeId, ioType],
        () => emitPosition('watch')
    );
</script>
