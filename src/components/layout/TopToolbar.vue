<template>
    <div class="bp-topbar">
        <!-- Brand -->
        <div class="bp-brand">
            <span class="bp-mark">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path
                        d="M6 6.5 L16.5 12 M6 6.5 L16.5 17.5 M16.5 12 L16.5 17.5"
                        stroke="#fff"
                        stroke-width="1.6"
                        stroke-linecap="round"
                        opacity="0.85"
                    />
                    <circle cx="6" cy="6.5" r="3" fill="#fff" />
                    <circle cx="17" cy="12" r="2.6" fill="#fff" />
                    <circle cx="17" cy="17.5" r="2.6" fill="#fff" />
                </svg>
            </span>
            <span class="bp-word">BLUEPRINTS</span>
        </div>

        <!-- Breadcrumb (static placeholder — no file concept wired yet) -->
        <div class="bp-breadcrumb">
            <span class="file">{{ workspaceName }}</span>
            <span aria-hidden="true">›</span>
            <span class="cur">editor</span>
        </div>

        <span class="bp-tsep"></span>

        <!-- View menu -->
        <DropdownMenu button-class="bp-tbtn" label="View" width-class="w-56">
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('toggle-palette')"
                >
                    {{ showNodePalette ? 'Hide' : 'Show' }} Palette
                </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('toggle-debug')"
                >
                    {{ debugMode ? 'Disable Debug' : 'Enable Debug' }}
                </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('reset-viewport')"
                >
                    Reset View
                </button>
            </MenuItem>
        </DropdownMenu>

        <!-- Graph menu -->
        <DropdownMenu button-class="bp-tbtn" label="Graph" width-class="w-64">
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    :disabled="isExecuting"
                    class="w-full px-3 py-1.5 text-left text-sm disabled:opacity-50"
                    @click="$emit('run-graph')"
                >
                    Run Graph
                </button>
            </MenuItem>
            <MenuItem v-if="isExecuting" v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('stop-execution')"
                >
                    Stop
                </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('clear-results')"
                >
                    Clear Results
                </button>
            </MenuItem>
            <div class="my-1 border-t" style="border-color: var(--line)"></div>
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('compile-graph')"
                >
                    Compile
                </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('create-test-graph')"
                >
                    Create Test Graph
                </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('open-entry-points')"
                >
                    Entry Points
                </button>
            </MenuItem>
        </DropdownMenu>

        <!-- Project menu -->
        <DropdownMenu button-class="bp-tbtn" label="Project" width-class="w-56">
            <MenuItem v-slot="{ active }">
                <button
                    :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                    class="w-full px-3 py-1.5 text-left text-sm"
                    @click="$emit('open-project')"
                >
                    Open Project
                </button>
            </MenuItem>
        </DropdownMenu>

        <span class="bp-tsep"></span>

        <!-- Add Node dropdown (trigger restyled + Tab chip via scoped :deep) -->
        <div class="bp-addnode">
            <NodeDropdown title="Add Node" @node-select="onNodeSelect" />
        </div>

        <!-- Spacer -->
        <div class="ml-auto flex items-center gap-3">
            <span class="bp-hint">Right-click + drag to pan | Mouse wheel to zoom</span>
            <span v-if="debugMode" class="bp-hint mono"
                >X: {{ Math.round(viewport.x) }}, Y: {{ Math.round(viewport.y) }}, Zoom: {{ viewport.zoom.toFixed(2) }}</span
            >
            <span v-if="executionSummary?.isComplete || isExecuting" class="text-xs">
                <span v-if="executionSummary?.isComplete && executionSummary?.errors === 0" style="color: var(--ok)"
                    >✅ {{ executionSummary.executedNodes }}/{{ executionSummary.totalNodes }}</span
                >
                <span v-else-if="executionSummary?.isComplete && executionSummary?.errors > 0" style="color: var(--warn)"
                    >⚠️ {{ executionSummary.executedNodes }}/{{ executionSummary.totalNodes }} ({{ executionSummary.errors }} errors)</span
                >
                <span v-else-if="isExecuting" style="color: var(--accent)">🔄 {{ executionSummary?.executedNodes }} done</span>
            </span>

            <!-- Prominent Run action — emits the same run-graph event -->
            <button class="bp-compile" :disabled="isExecuting" @click="$emit('run-graph')">
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M6 4.5v11a.75.75 0 001.14.64l9-5.5a.75.75 0 000-1.28l-9-5.5A.75.75 0 006 4.5z" />
                </svg>
                Run
            </button>

            <!-- Settings menu -->
            <DropdownMenu button-class="bp-iconbtn" width-class="w-52" align="right">
                <template #trigger>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <circle cx="12" cy="12" r="3" />
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.31.22.65.22 1s-.08.69-.22 1z"
                        />
                    </svg>
                </template>
                <MenuItem v-slot="{ active }">
                    <button
                        :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                        class="w-full px-3 py-1.5 text-left text-sm"
                        @click="$emit('reset-viewport')"
                    >
                        Reset View
                    </button>
                </MenuItem>
                <MenuItem v-slot="{ active }">
                    <button
                        :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                        class="w-full px-3 py-1.5 text-left text-sm"
                        @click="$emit('reset-layout')"
                    >
                        Reset Panel Sizes
                    </button>
                </MenuItem>
                <MenuItem v-slot="{ active }">
                    <button
                        :class="active ? 'bg-zinc-100 dark:bg-zinc-700' : ''"
                        class="w-full px-3 py-1.5 text-left text-sm"
                        @click="$emit('toggle-debug')"
                    >
                        {{ debugMode ? 'Hide' : 'Show' }} Debug Overlays
                    </button>
                </MenuItem>
            </DropdownMenu>
        </div>
    </div>
</template>

<script setup>
    import { computed, defineAsyncComponent } from 'vue';
    import { MenuItem } from '@headlessui/vue';
    import DropdownMenu from './DropdownMenu.vue';
    import { activeWorkspace } from '../../utils/state.js';

    defineProps({
        showNodePalette: { type: Boolean, default: true },
        debugMode: { type: Boolean, default: false },
        isExecuting: { type: Boolean, default: false },
        viewport: { type: Object, required: true },
        executionSummary: { type: Object, required: true }
    });

    const emit = defineEmits([
        'toggle-palette',
        'toggle-debug',
        'reset-viewport',
        'reset-layout',
        'run-graph',
        'compile-graph',
        'stop-execution',
        'clear-results',
        'create-test-graph',
        'open-entry-points',
        'add-node-from-dropdown',
        'open-project'
    ]);

    // Breadcrumb reflects the active workspace.
    const workspaceName = computed(() => activeWorkspace.value?.name || 'untitled');

    const NodeDropdown = defineAsyncComponent(() => import('../NodeDropdown.vue'));

    function onNodeSelect(node) {
        emit('add-node-from-dropdown', node.id);
    }
</script>

<style scoped>
    .bp-hint {
        font-size: 11px;
        color: var(--ink-3);
        white-space: nowrap;
    }

    .bp-compile:disabled {
        opacity: 0.55;
    }

    /* Restyle the NodeDropdown trigger to match the dark toolbar (.bp-tbtn look)
       without editing NodeDropdown itself, and append a visual-only Tab chip. */
    .bp-addnode :deep(> div > button) {
        height: 30px;
        padding: 0 11px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 7px;
        color: var(--ink-2);
        font-family: var(--font-ui);
        font-size: 12.5px;
        font-weight: 500;
    }
    .bp-addnode :deep(> div > button:hover) {
        background: var(--raised);
        border-color: var(--line);
        color: var(--ink);
    }
    .bp-addnode :deep(> div > button)::after {
        content: 'Tab';
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--ink-4);
        border: 1px solid var(--line);
        border-radius: 4px;
        padding: 1px 4px;
        margin-left: 4px;
    }
</style>
