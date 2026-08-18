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
                <input v-model="filter" placeholder="Filter nodes..." />
            </div>

            <!-- Script outline: the active graph grouped by category -->
            <div class="flex-1 overflow-y-auto px-1.5 pb-2">
                <div v-if="groups.length === 0" class="px-2 py-3 text-[10px] text-[var(--ink-3)]">
                    {{ filter ? 'No matching nodes.' : 'No nodes yet.' }}
                </div>
                <div v-for="group in groups" :key="group.key" class="mt-2">
                    <button class="bp-collapse-head px-2 py-1.5" @click="toggle(group.key)">
                        <span class="bp-dotk" :class="`na-${group.color}`"></span>
                        <span class="bp-sec-label">{{ group.name }}</span>
                        <span class="ml-auto text-[10px] text-[var(--ink-4)]">{{ group.nodes.length }}</span>
                    </button>
                    <div v-show="!collapsed[group.key]" class="mt-0.5">
                        <div
                            v-for="n in group.nodes"
                            :key="n.id"
                            class="bp-row !py-1 text-xs"
                            :class="{ sel: selectedNodeId === n.id }"
                            @click="select(n)"
                        >
                            <span class="truncate">{{ n.label }}</span>
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
    import { getCategoryColor, getCategoryName } from '../../utils/language-definition.js';

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

    // Group the active graph's nodes by category into collapsible outline sections.
    const groups = computed(() => {
        const q = filter.value.trim().toLowerCase();
        const byCat = new Map();
        for (const n of nodes.value) {
            const label = n.name || n.nodeDefId || `Node ${n.id}`;
            if (q && !label.toLowerCase().includes(q)) continue;
            const cat = n.category || (n.type ? String(n.type).toUpperCase() : 'OTHER');
            if (!byCat.has(cat)) byCat.set(cat, []);
            byCat.get(cat).push({ id: n.id, label });
        }
        return [...byCat.entries()]
            .map(([cat, items]) => ({ key: cat, name: getCategoryName(cat), color: getCategoryColor(cat), nodes: items }))
            .sort((a, b) => a.name.localeCompare(b.name));
    });

    function toggle(key) {
        collapsed.value = { ...collapsed.value, [key]: !collapsed.value[key] };
    }

    function select(n) {
        selectNode({ id: n.id });
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
