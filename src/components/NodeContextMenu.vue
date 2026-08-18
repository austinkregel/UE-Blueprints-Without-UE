<template>
    <div
        v-if="visible"
        :style="{ top: position.y + 'px', left: position.x + 'px' }"
        The
        class="context-menu bp-popup fixed z-50 min-w-48"
        @click.stop
    >
        <div class="py-2">
            <!-- Node Info Header -->
            <div class="ncm-header">
                <div class="ncm-title">{{ node?.name || `Node ${node?.id}` }}</div>
                <div class="ncm-subtitle">{{ node?.nodeDefId || node?.type }}</div>
            </div>

            <!-- Node Actions -->
            <div class="bp-sec-label px-3 py-1">Actions</div>

            <button class="ncm-item" @click="handleAction('duplicate')">
                <svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                    />
                </svg>
                Duplicate
            </button>

            <button class="ncm-item" @click="handleAction('copy')">
                <svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                    />
                </svg>
                Copy
            </button>

            <button class="ncm-item" @click="handleAction('edit')">
                <svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                    />
                </svg>
                Edit Properties
            </button>

            <div class="ncm-sep"></div>

            <!-- Execution Actions -->
            <div class="bp-sec-label ncm-label-accent px-3 py-1">Execution</div>

            <button
                v-if="canBeEntryPoint"
                class="ncm-item ncm-item-accent"
                @click="handleAction(isEntryPoint ? 'remove-entry-point' : 'add-entry-point')"
            >
                <svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 3l14 9-14 9V3z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                </svg>
                {{ isEntryPoint ? 'Remove Entry Point' : 'Set as Entry Point' }}
            </button>

            <button v-if="canBeEntryPoint && isEntryPoint" class="ncm-item ncm-item-ok" @click="handleAction('execute-from-here')">
                <svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 8h6M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                    />
                </svg>
                Execute from Here
            </button>

            <div class="ncm-sep"></div>

            <!-- Dangerous Actions -->
            <div class="bp-sec-label ncm-label-danger px-3 py-1">Danger Zone</div>

            <button class="ncm-item ncm-item-warn" @click="handleAction('disconnect')">
                <svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                    />
                </svg>
                Disconnect All
            </button>

            <button class="ncm-item ncm-item-danger" @click="handleAction('delete')">
                <svg class="mr-3 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                    />
                </svg>
                Delete Node
            </button>
        </div>
    </div>
</template>

<script setup>
    import { computed, watch } from 'vue';
    import { isEntryPoint as checkIsEntryPoint } from '../utils/graph-executor.js';

    const props = defineProps({
        visible: Boolean,
        position: {
            type: Object,
            default: () => ({ x: 0, y: 0 })
        },
        node: {
            type: Object,
            default: null
        }
    });

    const emit = defineEmits(['action', 'close']);

    // Computed properties
    const canBeEntryPoint = computed(() => {
        if (!props.node) return false;

        // Check if node can be an entry point (has exec outputs or is a function/system node)
        const hasExecOutput = props.node.outputs?.some((output) => output.type === 'exec');
        const isFunction = props.node.type === 'function';
        const isSystem = props.node.type === 'system';

        return hasExecOutput || isFunction || isSystem;
    });

    const isEntryPoint = computed(() => {
        return props.node ? checkIsEntryPoint(props.node.id) : false;
    });

    function handleAction(actionType) {
        emit('action', {
            type: actionType,
            node: props.node,
            position: props.position
        });
        emit('close');
    }

    // Close when clicking outside or pressing escape
    watch(
        () => props.visible,
        (newVisible) => {
            if (newVisible) {
                // Add click listener to close menu when clicking outside
                setTimeout(() => {
                    document.addEventListener('click', handleOutsideClick);
                    document.addEventListener('keydown', handleKeyDown);
                }, 0);
            } else {
                document.removeEventListener('click', handleOutsideClick);
                document.removeEventListener('keydown', handleKeyDown);
            }
        }
    );

    function handleOutsideClick() {
        emit('close');
    }

    function handleKeyDown(event) {
        if (event.key === 'Escape') {
            emit('close');
        }
    }
</script>

<style scoped>
    .bp-popup {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 10px;
        box-shadow:
            0 18px 40px -16px rgba(0, 0, 0, 0.75),
            0 0 0 1px rgba(0, 0, 0, 0.3);
        color: var(--ink);
        font-family: var(--font-ui);
    }

    .ncm-header {
        padding: 8px 12px;
        border-bottom: 1px solid var(--line);
    }
    .ncm-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--ink);
    }
    .ncm-subtitle {
        font-size: 11px;
        color: var(--ink-3);
    }

    .ncm-sep {
        margin: 8px 0;
        border-top: 1px solid var(--line);
    }

    .ncm-label-accent {
        color: var(--accent);
    }
    .ncm-label-danger {
        color: var(--t-bool);
    }

    .ncm-item {
        display: flex;
        width: 100%;
        align-items: center;
        padding: 8px 12px;
        text-align: left;
        font-size: 13px;
        color: var(--ink-2);
        background: transparent;
        border: none;
        cursor: pointer;
    }
    .ncm-item:hover {
        background: var(--raised);
        color: var(--ink);
    }
    .ncm-item-accent {
        color: var(--accent);
    }
    .ncm-item-ok {
        color: var(--ok);
    }
    .ncm-item-warn {
        color: var(--t-array);
    }
    .ncm-item-danger {
        color: var(--t-bool);
    }
    .ncm-item-danger:hover {
        background: rgba(239, 68, 68, 0.14);
        color: #ff8080;
    }

    /* Keep custom animation as Tailwind doesn't have built-in keyframe animations */
    .context-menu {
        @apply max-h-[80vh] overflow-y-auto;
        animation: contextMenuSlide 0.15s ease-out;
    }

    @keyframes contextMenuSlide {
        from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
</style>
