<template>
    <div
        :data-io-name="io.name || io"
        :class="[
            'io connection-pin flex min-h-[26px] cursor-pointer items-center rounded-sm px-2 text-xs transition-colors select-none hover:bg-white/10',
            ioType,
            ioType === 'input' ? 'justify-start' : 'justify-end',
            customClasses
        ]"
        @contextmenu="handleContextMenu"
        @mousedown.stop.prevent="handleIOStart"
    >
        <!-- Input layout: Icon first, then label -->
        <template v-if="ioType === 'input'">
            <component
                :is="iconComponent"
                :active="!!connection"
                :connection="connection"
                :io-type="io.type || 'mixed'"
                class="mr-1 h-4 w-4"
                v-bind="iconProps"
            />
            <Type :name="displayName" :type="io.type" class="io-label" :class="labelClasses" />
            <!-- Show a literal value baked onto the pin (e.g. a call argument) inline. -->
            <span v-if="showDefault" class="io-default" :title="String(io.defaultValue)">{{ displayDefault }}</span>
        </template>

        <!-- Output layout: Label first, then icon -->
        <template v-else>
            <Type :name="displayName" :type="io.type" class="io-label" :class="labelClasses" />
            <component
                :is="iconComponent"
                :active="!!connection"
                :connection="connection"
                :io-type="io.type || 'mixed'"
                class="ml-1 h-4 w-4"
                v-bind="iconProps"
            />
        </template>
    </div>
</template>

<script setup>
    import { inject, computed } from 'vue';
    import ExecutionIcon from '../icons/ExecutionIcon.vue';
    import ConnectionIcon from '../icons/ConnectionIcon.vue';
    import Type from '../Type.vue';
    import { startConnectionDrag } from '../../utils/drag-connect.js';
    import { getRectXBasedOnType, getRectYBasedOnType } from '../../utils/io-utils.js';
    import { screenToWorld } from '../../utils/viewport-utils.js';

    const { io, connection, nodeId, ioType, pinType, customClasses, labelClasses, iconProps } = defineProps({
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
        },
        // Visual customization props
        pinType: {
            type: String,
            default: 'data', // 'data' or 'exec'
            validator: (value) => ['data', 'exec'].includes(value)
        },
        customClasses: {
            type: String,
            default: ''
        },
        labelClasses: {
            type: String,
            default: ''
        },
        iconProps: {
            type: Object,
            default: () => ({})
        }
    });

    // Generic placeholder pin names the lowering emits when it has no real name
    // (unresolved/argless calls). Blank them — the wired value or baked literal
    // already says what's passed, so "arg1/arg2/result" is just noise. Resolved
    // definitions carry real names and are shown as-is.
    const GENERIC_PIN = /^(arg\d+|result)$/;
    const displayName = computed(() => {
        const n = io && typeof io === 'object' ? io.name : io;
        return GENERIC_PIN.test(String(n)) ? '' : n;
    });

    // A literal value baked onto an (unconnected) input pin — shown inline so
    // parameters read on the node face, not just in the inspector.
    const showDefault = computed(
        () =>
            ioType === 'input' &&
            !connection &&
            io &&
            typeof io === 'object' &&
            io.defaultValue !== undefined &&
            io.defaultValue !== null &&
            io.defaultValue !== ''
    );
    const displayDefault = computed(() => {
        const v = io && io.defaultValue;
        if (typeof v === 'string') {
            const s = v.length > 28 ? v.slice(0, 28) + '…' : v;
            return `"${s}"`;
        }
        return String(v);
    });

    const emit = defineEmits(['io-context-menu']);

    // Inject the onIOContextMenu function from the parent node
    const onIOContextMenu = inject('onIOContextMenu');

    // Determine which icon component to use based on pin type
    const iconComponent = computed(() => {
        return pinType === 'exec' ? ExecutionIcon : ConnectionIcon;
    });

    function handleContextMenu(event) {
        if (onIOContextMenu) {
            onIOContextMenu(ioType, io, event);
        }
        emit('io-context-menu', { type: ioType, io: io, event });
    }

    function handleIOStart(event) {
        // Get the IO element's position for accurate drag start
        const el = event.currentTarget;
        const rect = el.getBoundingClientRect();
        const screenX = getRectXBasedOnType(ioType, rect);
        const screenY = getRectYBasedOnType(ioType, rect);

        // Convert to world coordinates
        const worldPos = screenToWorld(screenX, screenY);

        startConnectionDrag({
            nodeId,
            ioType,
            ioName: io.name || io,
            x: worldPos.x,
            y: worldPos.y,
            icon: !!io.icon
        });
    }
</script>
