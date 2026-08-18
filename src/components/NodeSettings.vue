<template>
    <div class="ns-inspector border-t border-[var(--line)] bg-[var(--panel)] text-[11px] leading-tight text-[var(--ink)]">
        <!-- Node Settings Section (shown when a node is selected) -->
        <div v-if="selectedNode">
            <!-- Inspector header -->
            <div class="bp-insp-header">
                <div class="flex items-start gap-3">
                    <span class="bp-nicon" :class="`na-${nodeColorName}`"><i></i></span>
                    <div class="min-w-0">
                        <h1 class="truncate text-[16px] font-bold text-[var(--ink)]">
                            {{ selectedNode.name || selectedNode.nodeDefId || 'Node ' + selectedNode.id }}
                        </h1>
                        <div class="mt-1.5 flex flex-wrap gap-1.5">
                            <span class="bp-chip cat" :class="`na-${nodeColorName}`">{{ selectedNode.category || selectedNode.type || 'node' }}</span>
                            <span v-if="selectedNode.nodeDefId" class="bp-chip mono">{{ selectedNode.nodeDefId }}</span>
                        </div>
                    </div>
                    <button class="bp-btn ml-auto shrink-0" title="Close" @click="close">Close</button>
                </div>
                <p v-if="selectedNode.description" class="bp-desc">{{ selectedNode.description }}</p>
            </div>

            <!-- Parameters (edit each input's default value, live) -->
            <div v-if="paramInputs.length" class="bp-sec">
                <span class="bp-sec-label mb-2 block">Parameters</span>
                <div v-for="inp in paramInputs" :key="inp.name" class="bp-prow">
                    <div class="pl">
                        {{ inp.name }}<span class="bp-ty">{{ inp.type }}</span>
                    </div>
                    <div class="pc min-w-0">
                        <button
                            v-if="inp.type === 'bool'"
                            class="bp-switch"
                            :class="{ on: !!inp.defaultValue }"
                            @click="inp.defaultValue = !inp.defaultValue"
                        ></button>
                        <div v-else-if="inp.type === 'int' || inp.type === 'float'" class="bp-stepper">
                            <button @click="stepParam(inp, -1)">−</button>
                            <input v-model.number="inp.defaultValue" type="number" />
                            <button @click="stepParam(inp, 1)">+</button>
                        </div>
                        <input v-else v-model="inp.defaultValue" class="bp-input !h-8" :placeholder="inp.type" />
                    </div>
                </div>
            </div>

            <!-- Execution routing (exec pins → targets) -->
            <div v-if="execRouting.length" class="bp-sec">
                <span class="bp-sec-label mb-2 block">Execution</span>
                <div v-for="ex in execRouting" :key="ex.dir + ':' + ex.name" class="bp-execrow">
                    <i class="esw" :class="{ hollow: !ex.connected }"></i>
                    <span class="en">{{ ex.name }}</span>
                    <span class="tgt" :class="{ none: !ex.connected }">
                        {{ ex.connected ? (ex.dir === 'in' ? '← ' : '→ ') + ex.target : 'unconnected' }}
                    </span>
                </div>
            </div>

            <!-- Advanced: the raw node/IO editor -->
            <div class="bp-sec">
                <button class="bp-collapse-head" @click="advancedOpen = !advancedOpen">
                    <span class="bp-sec-label">Advanced</span>
                    <span class="tw">{{ advancedOpen ? '▾' : '▸' }}</span>
                </button>
                <div v-show="advancedOpen" class="mt-3">
                    <div class="mb-1 flex items-center gap-1">
                        <span class="bp-sec-label !text-[var(--ink-2)]">Node {{ selectedNode.id }}</span>
                        <button class="bp-btn primary ml-auto" title="Save changes" @click="save">Save</button>
                    </div>
                    <!-- General -->
                    <div class="mb-2 grid grid-cols-2 gap-1.5">
                        <div>
                            <label class="block text-[10px] text-[var(--ink-3)]" title="Type">Type</label>
                            <input :value="selectedNode.type" class="bp-input" disabled />
                        </div>
                        <div>
                            <label class="block text-[10px] text-[var(--ink-3)]" title="Category">Cat</label>
                            <input :value="selectedNode.category || ''" class="bp-input" disabled />
                        </div>
                        <div>
                            <label class="block text-[10px] text-[var(--ink-3)]" title="Definition">Def</label>
                            <input :value="selectedNode.nodeDefId || ''" class="bp-input" disabled />
                        </div>
                        <div>
                            <label class="block text-[10px] text-[var(--ink-3)]" title="Display Name">Name</label>
                            <input v-model="localName" class="bp-input" placeholder="(optional)" />
                        </div>
                        <div>
                            <label class="block text-[10px] text-[var(--ink-3)]">X</label>
                            <input v-model.number="localX" class="bp-input" type="number" />
                        </div>
                        <div>
                            <label class="block text-[10px] text-[var(--ink-3)]">Y</label>
                            <input v-model.number="localY" class="bp-input" type="number" />
                        </div>
                    </div>

                    <!-- Variable specific -->
                    <div v-if="selectedNode.type === 'variable'" class="mb-2">
                        <h4 class="bp-sec-label mb-1 !text-[var(--ink-2)]">Variable</h4>
                        <div class="mb-1.5 grid grid-cols-2 gap-1.5">
                            <div>
                                <label class="block text-[10px] text-[var(--ink-3)]">Action</label>
                                <select v-model="localVarAction" class="bp-input">
                                    <option value="get">get</option>
                                    <option value="set">set</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] text-[var(--ink-3)]">Type</label>
                                <select v-model="localVarType" class="bp-input">
                                    <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
                                </select>
                            </div>
                            <div class="col-span-2">
                                <label class="block text-[10px] text-[var(--ink-3)]">Name</label>
                                <input v-model="localVarName" class="bp-input" />
                            </div>
                        </div>
                        <div v-if="selectedNode.isLiteral" class="grid grid-cols-2 items-center gap-1.5">
                            <div class="col-span-2">
                                <label class="block text-[10px] text-[var(--ink-3)]">Literal</label>
                                <input v-if="localVarType === 'string'" v-model="localLiteralValueString" class="bp-input" />
                                <input
                                    v-else-if="localVarType === 'int' || localVarType === 'float'"
                                    v-model.number="localLiteralValueNumber"
                                    class="bp-input"
                                    type="number"
                                />
                                <label v-else-if="localVarType === 'bool'" class="inline-flex items-center gap-1 text-[11px] text-[var(--ink-2)]">
                                    <input v-model="localLiteralValueBool" type="checkbox" /> Boolean
                                </label>
                                <div v-else class="text-[10px] text-[var(--ink-3)]">Unsupported literal type</div>
                            </div>
                        </div>
                    </div>

                    <!-- Code Context for imported code nodes -->
                    <div v-if="selectedNode?.refs" class="mb-2">
                        <h4 class="bp-sec-label mb-1 !text-[var(--ink-2)]">Code Context</h4>
                        <div class="grid grid-cols-1 gap-0.5 text-[10px] text-[var(--ink-2)]">
                            <div><span class="text-[var(--ink-3)]">File:</span> {{ selectedNode.refs.filePath || '—' }}</div>
                            <div v-if="selectedNode.refs.language">
                                <span class="text-[var(--ink-3)]">Language:</span> {{ selectedNode.refs.language }}
                            </div>
                            <div v-if="selectedNode.refs.fqn">
                                <span class="text-[var(--ink-3)]">FQN:</span>
                                {{ selectedNode.refs.fqn }}
                            </div>
                            <div v-if="Array.isArray(selectedNode.refs.usage)">
                                <span class="text-[var(--ink-3)]">Usage:</span> {{ selectedNode.refs.usage.length }} place(s)
                            </div>
                        </div>
                        <ul
                            v-if="Array.isArray(selectedNode.refs.usage) && selectedNode.refs.usage.length"
                            class="mt-1 max-h-24 overflow-auto rounded border border-[var(--line)] text-[10px] text-[var(--ink-3)]"
                        >
                            <li
                                v-for="(u, i) in selectedNode.refs.usage.slice(0, 8)"
                                :key="i"
                                class="border-b border-[var(--line-soft)] px-1.5 py-0.5 last:border-b-0"
                            >
                                <div class="truncate">{{ u.filePath }}</div>
                                <div v-if="u.range" class="text-[var(--ink-4)]">@ {{ formatRange(u.range) }}</div>
                            </li>
                        </ul>
                    </div>

                    <!-- IO Editors -->
                    <label class="mb-0.5 block font-semibold text-[var(--ink-2)]">In:</label>
                    <ul class="flex flex-col">
                        <li
                            v-for="input in filteredInputs"
                            :key="input.name + '-' + input.type"
                            class="mb-1 flex items-center gap-1 whitespace-nowrap"
                        >
                            <input v-model="input.name" class="bp-input !h-7 !w-20" placeholder="name" />
                            <select v-model="input.type" class="bp-input !h-7 !w-20 appearance-none">
                                <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
                                <option v-if="!typeOptions.includes(input.type)" :value="input.type">{{ input.type }}</option>
                            </select>
                            <input v-model="input.type" class="bp-input !h-7 !w-24" placeholder="type" />
                            <button class="bp-btn !h-7 !px-2" title="Remove" @click="removeInput(localInputs.indexOf(input))">✕</button>
                        </li>
                    </ul>
                    <button class="bp-btn mb-2 !h-7 !px-2" title="Add Input" @click="addInput">+ In</button>
                    <label class="mb-0.5 block font-semibold text-[var(--ink-2)]">Out:</label>
                    <ul class="flex flex-col">
                        <li
                            v-for="output in filteredOutputs"
                            :key="output.name + '-' + output.type"
                            class="mb-1 flex items-center gap-1 whitespace-nowrap"
                        >
                            <input v-model="output.name" class="bp-input !h-7 !w-20" placeholder="name" />
                            <select v-model="output.type" class="bp-input !h-7 !w-20 appearance-none">
                                <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
                                <option v-if="!typeOptions.includes(output.type)" :value="output.type">{{ output.type }}</option>
                            </select>
                            <input v-model="output.type" class="bp-input !h-7 !w-24" placeholder="type" />
                            <button class="bp-btn !h-7 !px-2" title="Remove" @click="removeOutput(localOutputs.indexOf(output))">✕</button>
                        </li>
                    </ul>

                    <!-- IO Control for System Nodes -->
                    <div v-if="selectedNode.type === 'system'" class="mb-2">
                        <h4 class="bp-sec-label mb-1 !text-[var(--ink-2)]">IO Control</h4>
                        <div class="mb-1.5 grid grid-cols-2 gap-1.5">
                            <button class="bp-btn w-full" @click="addOutput">Add Output</button>
                            <button :disabled="selectedNode.outputs.length === 0" class="bp-btn w-full" @click="removeOutput">Remove Output</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Variables List Section -->
        <div :class="{ 'mt-2': !!selectedNode }" class="flex items-center gap-1 border-t border-[var(--line)] px-2 py-2">
            <span class="bp-sec-label !text-[var(--ink)]">Variables</span>
            <span v-if="variables?.length" :title="variables.length + ' variables'" class="ml-auto text-[10px] text-[var(--ink-3)]">{{
                variables.length
            }}</span>
        </div>
        <div class="max-h-56 overflow-y-auto p-1.5">
            <div v-if="!variables || variables.length === 0" class="px-2 py-3 text-[10px] text-[var(--ink-3)]">No variables detected.</div>
            <ul v-else class="space-y-1">
                <li v-for="v in variables" :key="v.name" class="bp-row min-w-0 !gap-1 !py-1 text-[10px]">
                    <span class="text-amber-300">$</span>
                    <span :title="v.name" class="flex-1 truncate text-[var(--ink-2)]">{{ v.name }}</span>
                    <span :title="v.type || 'mixed'" class="ml-auto text-[var(--ink-3)]">{{ v.type || 'mixed' }}</span>
                </li>
            </ul>
            <!-- Add Variable Form -->
            <div class="mt-2 grid grid-cols-5 items-end gap-1">
                <div class="col-span-2">
                    <label class="block text-[10px] text-[var(--ink-3)]">Name</label>
                    <input v-model="newVarName" class="bp-input !h-7" placeholder="myVar" />
                </div>
                <div>
                    <label class="block text-[10px] text-[var(--ink-3)]">Type</label>
                    <select v-model="newVarType" class="bp-input !h-7 !px-1.5">
                        <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] text-[var(--ink-3)]">Action</label>
                    <select v-model="newVarAction" class="bp-input !h-7 !px-1.5">
                        <option value="get">get</option>
                        <option value="set">set</option>
                    </select>
                </div>
                <div>
                    <button class="bp-btn primary !h-7 w-full justify-center" @click="createVariable">Add</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed, ref, watch } from 'vue';
    // Selected node reactive reference
    import { nodes, selectedNodeId } from '../utils/state.js';
    import { updateNode, updateNodeIO } from '../utils/nodes-core.js';
    import { closeSettings, selectNode } from '../utils/node-selection.js';
    import { addVariableNode } from '../utils/node-creation.js';
    import { getConnections } from '../utils/connection-manager.js';
    import { getNodeColor } from '../utils/node-colors.js';

    defineProps({ variables: { type: Array, default: () => [] } });
    const emit = defineEmits(['update-outputs']);

    const selectedNode = computed(() => nodes.value.find((n) => n.id === selectedNodeId.value) || null);

    // Inspector accent color (category-derived) for the header icon/chip.
    const nodeColorName = computed(() => getNodeColor(selectedNode.value?.type, selectedNode.value?.nodeDefId) || 'blue');

    // Editable non-exec inputs, shown as typed Parameter rows (bound live to defaultValue).
    const paramInputs = computed(() =>
        (selectedNode.value?.inputs || []).filter((i) => i && typeof i === 'object' && String(i.type).toLowerCase() !== 'exec')
    );

    function nodeLabel(id) {
        const n = nodes.value.find((x) => x.id === id);
        return n ? n.name || n.nodeDefId || `Node ${id}` : `Node ${id}`;
    }

    // Exec pins of the selected node with their wired target (for the Execution view).
    const execRouting = computed(() => {
        const n = selectedNode.value;
        if (!n) return [];
        const conns = getConnections();
        const rows = [];
        for (const inp of n.inputs || []) {
            if (inp && inp.type === 'exec') {
                const c = conns.find((cn) => cn.to?.nodeId === n.id && cn.to?.input === inp.name);
                rows.push({ dir: 'in', name: inp.name, connected: !!c, target: c ? nodeLabel(c.from.nodeId) : '' });
            }
        }
        for (const out of n.outputs || []) {
            if (out && out.type === 'exec') {
                const c = conns.find((cn) => cn.from?.nodeId === n.id && cn.from?.output === out.name);
                rows.push({ dir: 'out', name: out.name, connected: !!c, target: c ? nodeLabel(c.to.nodeId) : '' });
            }
        }
        return rows;
    });

    const advancedOpen = ref(false);

    function stepParam(inp, dir) {
        const cur = Number(inp.defaultValue) || 0;
        inp.defaultValue = cur + dir;
    }

    // Local editable copies
    const typeOptions = ['int', 'float', 'string', 'bool', 'array', 'object', 'callable', 'mixed', 'void', 'resource', 'null'];
    const localInputs = ref([]);
    const localOutputs = ref([]);
    const localName = ref('');
    const localX = ref(0);
    const localY = ref(0);
    const localVarName = ref('');
    const localVarType = ref('mixed');
    const localVarAction = ref('get');
    const localLiteralValueString = ref('');
    const localLiteralValueNumber = ref(0);
    const localLiteralValueBool = ref(false);

    // Add Variable form state
    const newVarName = ref('');
    const newVarType = ref('mixed');
    const newVarAction = ref('get');

    function normalizeIO(ioArr) {
        return (ioArr || []).map((io) => (typeof io === 'object' ? { ...io } : { name: io, type: '' }));
    }

    watch(
        selectedNode,
        (n) => {
            if (n) {
                localInputs.value = normalizeIO(n.inputs);
                localOutputs.value = normalizeIO(n.outputs);
                localName.value = n.name || '';
                localX.value = n.x || 0;
                localY.value = n.y || 0;
                localVarName.value = n.varName || '';
                localVarType.value = n.varType || 'mixed';
                localVarAction.value = n.varAction || 'get';
                localLiteralValueString.value = typeof n.value === 'string' ? n.value : '';
                localLiteralValueNumber.value = typeof n.value === 'number' ? n.value : 0;
                localLiteralValueBool.value = typeof n.value === 'boolean' ? n.value : false;
            } else {
                localInputs.value = [];
                localOutputs.value = [];
                localName.value = '';
                localX.value = 0;
                localY.value = 0;
                localVarName.value = '';
                localVarType.value = 'mixed';
                localVarAction.value = 'get';
                localLiteralValueString.value = '';
                localLiteralValueNumber.value = 0;
                localLiteralValueBool.value = false;
            }
        },
        { immediate: true }
    );

    const filteredInputs = computed(() => localInputs.value.filter((inp) => String(inp.type).toLowerCase() !== 'exec'));
    const filteredOutputs = computed(() => localOutputs.value.filter((out) => String(out.type).toLowerCase() !== 'exec'));

    function addInput() {
        localInputs.value.push({ name: 'Input', type: '' });
    }

    function removeInput(i) {
        localInputs.value.splice(i, 1);
    }

    function addOutput() {
        const newOutput = { id: `output-${selectedNode.value.outputs.length + 1}`, name: `Output ${selectedNode.value.outputs.length + 1}` };
        selectedNode.value.outputs.push(newOutput);
        emit('update-outputs', selectedNode.value.id, selectedNode.value.outputs);
    }

    function removeOutput() {
        if (selectedNode.value.outputs.length > 0) {
            selectedNode.value.outputs.pop();
            emit('update-outputs', selectedNode.value.id, selectedNode.value.outputs);
        }
    }

    function save() {
        const n = selectedNode.value;
        if (!n) return;
        updateNodeIO({
            id: n.id,
            inputs: localInputs.value.map((io) => ({ ...io })),
            outputs: localOutputs.value.map((io) => ({ ...io }))
        });
        const updates = { id: n.id, name: localName.value, x: localX.value, y: localY.value };
        if (n.type === 'variable') {
            updates.varName = localVarName.value;
            updates.varType = localVarType.value;
            updates.varAction = localVarAction.value;
            if (n.isLiteral) {
                updates.value =
                    localVarType.value === 'string'
                        ? localLiteralValueString.value
                        : localVarType.value === 'bool'
                          ? localLiteralValueBool.value
                          : Number(localLiteralValueNumber.value);
            }
        }
        if (n.type === 'function') {
            updates.funcName = localName.value || n.funcName;
        }
        updateNode(updates);
    }

    function close() {
        closeSettings();
    }

    function createVariable() {
        const name = (newVarName.value || '').trim();
        if (!name) return;
        const node = addVariableNode(name, newVarType.value || 'mixed', newVarAction.value || 'get');
        if (node) {
            selectNode({ id: node.id });
            newVarName.value = '';
            newVarType.value = 'mixed';
            newVarAction.value = 'get';
        }
    }

    function formatRange(r) {
        try {
            const s = r.start || {};
            const e = r.end || {};
            return `${s.row ?? '?'}:${s.col ?? '?'} - ${e.row ?? '?'}:${e.col ?? '?'}`;
        } catch {
            return '';
        }
    }
</script>
