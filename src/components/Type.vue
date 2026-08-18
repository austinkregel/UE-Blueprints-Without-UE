<template>
    <span class="pin-label pointer-events-none inline-flex items-center text-xs" :class="[typeClass, isExec ? 'font-semibold' : 'font-medium']">
        {{ name }}
    </span>
</template>

<script setup>
    import { computed } from 'vue';

    const props = defineProps({
        name: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        }
    });

    // Data types that have a dedicated color class in theme.css.
    const KNOWN_TYPES = ['exec', 'bool', 'int', 'float', 'string', 'array', 'object'];

    const isExec = computed(() => props.type === 'exec');

    // Map the io's data type to its `.type-*` color class; anything we don't
    // recognize falls back to the neutral "mixed" (slate) color.
    const typeClass = computed(() => {
        const t = KNOWN_TYPES.includes(props.type) ? props.type : 'mixed';
        return `type-${t}`;
    });
</script>

<style scoped>
    /* The `.type-*` classes (from theme.css) drive the label color per data
       type. Exec pins read as a bold white label; data pins take their type's
       color at a lighter weight so exec stays the visually dominant row. */
    .pin-label {
        letter-spacing: 0.01em;
    }
</style>
