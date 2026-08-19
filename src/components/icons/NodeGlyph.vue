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
        <!-- math / operator -->
        <template v-else-if="glyph === 'math'">
            <path d="M4 8h6M7 5v6" />
            <path d="M14 16h6" />
            <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
            <circle cx="7" cy="17" r="1" fill="currentColor" stroke="none" />
        </template>
        <!-- branch / condition -->
        <template v-else-if="glyph === 'branch'">
            <circle cx="6" cy="6" r="2" />
            <path d="M6 8v3a4 4 0 0 0 4 4h6" />
            <path d="M14 12l3 3-3 3" />
        </template>
        <!-- getter / query -->
        <template v-else-if="glyph === 'get'">
            <circle cx="10" cy="10" r="6" />
            <path d="M20 20l-5-5" />
        </template>
        <!-- ai -->
        <template v-else-if="glyph === 'ai'">
            <rect x="7" y="7" width="10" height="10" rx="2" />
            <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" />
        </template>
        <!-- ui / screen -->
        <template v-else-if="glyph === 'ui'">
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8M12 16v4" />
        </template>
        <!-- sound / audio -->
        <template v-else-if="glyph === 'sound'">
            <path d="M4 10v4M8 6v12M12 8v8M16 5v14M20 10v4" />
        </template>
        <!-- vehicle -->
        <template v-else-if="glyph === 'vehicle'">
            <path d="M3 14l2-6h14l2 6v3h-2M5 17H3v-3M9 17h6" />
            <circle cx="7" cy="17" r="1.6" />
            <circle cx="17" cy="17" r="1.6" />
        </template>
        <!-- network -->
        <template v-else-if="glyph === 'net'">
            <circle cx="6" cy="6" r="2" />
            <circle cx="18" cy="6" r="2" />
            <circle cx="12" cy="18" r="2" />
            <path d="M7.5 7.5 11 16M16.5 7.5 13 16M8 6h8" />
        </template>
        <!-- timer -->
        <template v-else-if="glyph === 'timer'">
            <circle cx="12" cy="13" r="7" />
            <path d="M12 13V9M9.5 3h5" />
        </template>
        <!-- player / character -->
        <template v-else-if="glyph === 'player'">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </template>
        <!-- default: filled rounded square -->
        <rect v-else x="6" y="6" width="12" height="12" rx="3" fill="currentColor" stroke="none" />
    </svg>
</template>

<script setup>
    import { computed } from 'vue';

    const props = defineProps({ name: { type: String, default: '' } });

    // Fold category icon names that have no dedicated shape onto the nearest glyph.
    const ALIASES = {
        bolt: 'event',
        trigger: 'event',
        target: 'objective',
        flag: 'mission',
        audio: 'sound',
        music: 'sound',
        control: 'flow',
        fn: 'function',
        method: 'function',
        calculate: 'math',
        operator: 'math',
        compare: 'math',
        list: 'object',
        array: 'object',
        dictionary: 'object',
        clock: 'timer',
        network: 'net',
        query: 'get',
        screen: 'ui',
        hud: 'ui',
        gui: 'ui',
        character: 'player',
        human: 'player'
    };
    const KNOWN = new Set([
        'event',
        'objective',
        'mission',
        'vo',
        'variable',
        'flow',
        'object',
        'function',
        'math',
        'branch',
        'get',
        'ai',
        'ui',
        'sound',
        'vehicle',
        'net',
        'timer',
        'player'
    ]);

    const glyph = computed(() => {
        const n = (props.name || '').toLowerCase();
        if (KNOWN.has(n)) return n;
        if (ALIASES[n]) return ALIASES[n];
        return 'default';
    });
</script>
