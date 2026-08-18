<template>
    <div class="flex">
        <div class="bp-panel left flex w-56 flex-col">
            <!-- Workflows -->
            <div class="bp-panel-head">
                <span class="bp-sec-label">Workflows</span>
                <button class="bp-btn primary ml-auto !h-7 !px-2 text-xs" @click="addTab">New</button>
            </div>
            <div class="flex max-h-40 flex-none flex-col gap-0.5 overflow-y-auto p-1.5">
                <div
                    v-for="tab in tabs"
                    :key="tab.id"
                    class="bp-row justify-between"
                    :class="{ sel: activeTab === tab.id }"
                    @click="switchTab(tab.id)"
                >
                    <span class="truncate">{{ tab.name }}</span>
                    <button class="ml-2 text-xs text-[var(--ink-3)] hover:text-[var(--ink)]" @click.stop="closeTab(tab.id)">x</button>
                </div>
            </div>

            <!-- Outline filter -->
            <div class="bp-filter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" stroke-linecap="round" />
                </svg>
                <input v-model="filter" placeholder="Filter…" />
            </div>

            <!-- Script outline: generic section model -->
            <div class="flex-1 overflow-y-auto px-1.5 pb-2">
                <div v-if="!hasAnyItems" class="px-2 py-3 text-[10px] text-[var(--ink-3)]">
                    {{ filter ? 'No matching nodes.' : 'No nodes yet.' }}
                </div>

                <div v-for="section in sections" :key="section.id" class="mt-2">
                    <div class="bp-collapse-head px-2 py-1.5">
                        <button class="flex min-w-0 flex-1 items-center gap-2 bg-transparent" @click="toggle(section.id)">
                            <NodeGlyph
                                v-if="section.icon"
                                :name="section.icon"
                                class="h-3.5 w-3.5 flex-none"
                                :class="`na-${section.color || 'gray'}`"
                                style="color: var(--na)"
                            />
                            <span v-else class="bp-dotk flex-none" :class="`na-${section.color || 'gray'}`"></span>
                            <span class="bp-sec-label truncate">{{ section.title }}</span>
                            <span
                                v-if="section.hint"
                                class="truncate text-[10px] text-[var(--ink-4)] normal-case"
                                style="font-size: 10px; text-transform: none"
                            >
                                {{ section.hint }}
                            </span>
                            <span class="ml-auto flex-none text-[10px] text-[var(--ink-4)]">{{ section.items.length }}</span>
                            <span class="tw flex-none" :class="{ 'rotate-90': !collapsed[section.id] }">▸</span>
                        </button>
                        <button v-if="section.addable" class="bp-btn ml-1 !h-5 !w-5 flex-none !p-0 text-xs" title="Add" @click.stop>+</button>
                    </div>

                    <div v-show="!collapsed[section.id]" class="mt-0.5">
                        <div
                            v-for="item in section.items"
                            :key="item.id"
                            class="bp-row !py-1 text-xs"
                            :class="{ sel: item.nodeId != null && selectedNodeId === item.nodeId, 'cursor-pointer': item.nodeId != null }"
                            @click="onItemClick(item)"
                        >
                            <NodeGlyph
                                v-if="item.icon"
                                :name="item.icon"
                                class="h-3.5 w-3.5 flex-none"
                                :class="`na-${item.color || 'gray'}`"
                                style="color: var(--na)"
                            />
                            <span v-else class="bp-dotk flex-none" :class="`na-${item.color || 'gray'}`"></span>
                            <span class="truncate">{{ item.label }}</span>
                            <span v-if="item.issues" class="ml-1 flex-none text-[10px]" style="color: var(--warn)">⚠</span>
                            <span v-if="item.kind" class="ml-auto flex-none font-mono text-[10px] text-[var(--ink-4)]">{{ item.kind }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed, ref } from 'vue';
    import { createWorkspace, deleteWorkspace, nodes, selectedNodeId, switchWorkspace, workspaceState } from '../../utils/state';
    import { selectNode } from '../../utils/node-selection.js';
    import { getOutlineSections } from '../../utils/outline.js';
    import { getNodeIssues } from '../../utils/node-inspector.js';
    import { getConnections } from '../../utils/connection-manager.js';
    import NodeGlyph from '../icons/NodeGlyph.vue';

    const tabs = computed(() => {
        return Object.keys(workspaceState.workspaces).map((id) => ({
            id,
            name: workspaceState.workspaces[id].name || `Workflow ${id}`
        }));
    });

    const activeTab = computed(() => workspaceState.activeWorkspaceId);

    // ----- script outline -----
    const filter = ref('');
    const collapsed = ref({});

    // Derive variables the same way App.vue does: unique {name, type} pairs.
    const variables = computed(() => {
        const seen = new Set();
        const list = [];
        for (const n of nodes.value) {
            if (n.type === 'variable' && n.varName) {
                const name = n.varName;
                const type = n.varType || 'mixed';
                const key = `${name}|${type}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    list.push({ name, type });
                }
            }
        }
        return list;
    });

    // Look up a live node by id so we can compute issues for outline items.
    const nodeById = computed(() => {
        const map = new Map();
        for (const n of nodes.value) map.set(n.id, n);
        return map;
    });

    // Generic sections from the outline model (provider or fallback), then
    // filtered by label and annotated with per-item issue counts.
    const sections = computed(() => {
        const q = filter.value.trim().toLowerCase();
        const connections = getConnections();
        const raw = getOutlineSections({ nodes: nodes.value, variables: variables.value });

        return raw
            .map((section) => {
                const items = (section.items || [])
                    .filter(
                        (item) =>
                            !q ||
                            String(item.label || '')
                                .toLowerCase()
                                .includes(q)
                    )
                    .map((item) => {
                        let issues = 0;
                        if (item.nodeId != null) {
                            const node = nodeById.value.get(item.nodeId);
                            if (node) issues = getNodeIssues(node, { connections }).length;
                        }
                        return { ...item, issues };
                    });
                return { ...section, items };
            })
            .filter((section) => !q || section.items.length > 0);
    });

    const hasAnyItems = computed(() => sections.value.some((s) => s.items.length > 0));

    function toggle(id) {
        collapsed.value = { ...collapsed.value, [id]: !collapsed.value[id] };
    }

    function onItemClick(item) {
        if (item.nodeId != null) selectNode({ id: item.nodeId });
    }

    function addTab() {
        const newTabId = Date.now();
        createWorkspace(newTabId, {
            name: `Workflow ${tabs.value.length}`
        });
        switchWorkspace(newTabId);
    }

    function switchTab(tabId) {
        switchWorkspace(tabId);
    }

    function closeTab(tabId) {
        deleteWorkspace(tabId);
    }
</script>
