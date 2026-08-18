<template>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <!-- event / trigger -->
        <path v-if="glyph === 'event'" d="M13 2 4 13h6l-1 9 9-11h-6z" fill="currentColor" stroke="none" />
        <!-- objective / target -->
        <template v-else-if="glyph === 'objective'">
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
        </template>
        <!-- mission / flag -->
        <template v-else-if="glyph === 'mission'">
            <path d="M5 21V4" />
            <path d="M5 4h11l-2 4 2 4H5" fill="currentColor" stroke="none" />
        </template>
        <!-- vo / sound -->
        <template v-else-if="glyph === 'vo'">
            <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none" />
            <path d="M17 8a5 5 0 0 1 0 8" />
        </template>
        <!-- variable -->
        <template v-else-if="glyph === 'variable'">
            <rect x="4" y="5" width="16" height="14" rx="3" />
            <path d="M9 9l6 6M15 9l-6 6" />
        </template>
        <!-- control / flow -->
        <template v-else-if="glyph === 'flow'">
            <circle cx="6" cy="6" r="2.4" />
            <circle cx="6" cy="18" r="2.4" />
            <circle cx="18" cy="12" r="2.4" />
            <path d="M8 6.6C13 7.5 13 12 16 11.7M8 17.4C13 16.5 13 12 16 12.3" />
        </template>
        <!-- object -->
        <template v-else-if="glyph === 'object'">
            <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
            <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
        </template>
        <!-- function -->
        <template v-else-if="glyph === 'function'">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M10 8.5l4.5 3.5L10 15.5z" fill="currentColor" stroke="none" />
        </template>
        <!-- default: filled rounded square -->
        <rect v-else x="6" y="6" width="12" height="12" rx="3" fill="currentColor" stroke="none" />
    </svg>
</template>

<script setup>
    import { computed } from 'vue';

    const props = defineProps({ name: { type: String, default: '' } });

    // Fold many category icon names onto the small built-in glyph set.
    const ALIASES = {
        bolt: 'event',
        trigger: 'event',
        target: 'objective',
        flag: 'mission',
        sound: 'vo',
        audio: 'vo',
        music: 'vo',
        control: 'flow',
        branch: 'flow',
        fn: 'function',
        method: 'function',
        calculate: 'function',
        list: 'object',
        array: 'object',
        dictionary: 'object'
    };
    const KNOWN = new Set(['event', 'objective', 'mission', 'vo', 'variable', 'flow', 'object', 'function']);

    const glyph = computed(() => {
        const n = (props.name || '').toLowerCase();
        if (KNOWN.has(n)) return n;
        if (ALIASES[n]) return ALIASES[n];
        return 'default';
    });
</script>
