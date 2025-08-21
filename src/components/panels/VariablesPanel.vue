<template>
  <div class="border-t border-zinc-200 bg-white/80 text-[11px] leading-tight dark:border-zinc-700 dark:bg-zinc-900/80">
    <!-- Node Settings Section (shown when a node is selected) -->
    <div v-if="selectedNode" class="px-2 pt-1">
      <div class="mb-1 flex items-center gap-1">
        <span class="font-semibold text-zinc-700 dark:text-zinc-200">Node {{ selectedNode.id }}</span>
        <button
            class="ml-auto rounded-sm bg-cyan-600 px-1.5 py-0.5 text-[10px] text-white hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800"
            title="Save changes"
            @click="save"
        >
          Save
        </button>
        <button
            class="rounded-sm bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
            title="Close settings"
            @click="close"
        >
          Close
        </button>
      </div>
      <!-- General -->
      <div class="mb-2 grid grid-cols-2 gap-1.5">
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400" title="Type">Type</label>
          <input
              :value="selectedNode.type"
              class="w-full rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              disabled
          />
        </div>
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400" title="Category">Cat</label>
          <input
              :value="selectedNode.category || ''"
              class="w-full rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              disabled
          />
        </div>
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400" title="Definition">Def</label>
          <input
              :value="selectedNode.nodeDefId || ''"
              class="w-full rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              disabled
          />
        </div>
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400" title="Display Name">Name</label>
          <input
              v-model="localName"
              class="w-full rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              placeholder="(optional)"
          />
        </div>
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">X</label>
          <input
              v-model.number="localX"
              class="w-full rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              type="number"
          />
        </div>
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Y</label>
          <input
              v-model.number="localY"
              class="w-full rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              type="number"
          />
        </div>
      </div>

      <!-- Variable specific -->
      <div v-if="selectedNode.type === 'variable'" class="mb-2">
        <h4 class="mb-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">Variable</h4>
        <div class="mb-1.5 grid grid-cols-2 gap-1.5">
          <div>
            <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Action</label>
            <select
                v-model="localVarAction"
                class="w-full rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="get">get</option>
              <option value="set">set</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Type</label>
            <select
                v-model="localVarType"
                class="w-full rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Name</label>
            <input
                v-model="localVarName"
                class="w-full rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>
        </div>
        <div v-if="selectedNode.isLiteral" class="grid grid-cols-2 items-center gap-1.5">
          <div class="col-span-2">
            <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Literal</label>
            <input
                v-if="localVarType === 'string'"
                v-model="localLiteralValueString"
                class="w-full rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
            <input
                v-else-if="localVarType === 'int' || localVarType === 'float'"
                v-model.number="localLiteralValueNumber"
                class="w-full rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                type="number"
            />
            <label
                v-else-if="localVarType === 'bool'"
                class="inline-flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-200"
            >
              <input v-model="localLiteralValueBool" type="checkbox"/> Boolean
            </label>
            <div v-else class="text-[10px] text-zinc-500 dark:text-zinc-400">Unsupported literal type</div>
          </div>
        </div>
      </div>

      <!-- Code Context for imported code nodes -->
      <div v-if="selectedNode?.refs" class="mb-2">
        <h4 class="mb-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">Code Context</h4>
        <div class="grid grid-cols-1 gap-0.5 text-[10px] text-zinc-600 dark:text-zinc-300">
          <div><span class="text-zinc-500 dark:text-zinc-400">File:</span> {{ selectedNode.refs.filePath || '—' }}</div>
          <div v-if="selectedNode.refs.language">
            <span class="text-zinc-500 dark:text-zinc-400">Language:</span> {{ selectedNode.refs.language }}
          </div>
          <div v-if="selectedNode.refs.fqn"><span class="text-zinc-500 dark:text-zinc-400">FQN:</span>
            {{ selectedNode.refs.fqn }}
          </div>
          <div v-if="Array.isArray(selectedNode.refs.usage)">
            <span class="text-zinc-500 dark:text-zinc-400">Usage:</span> {{ selectedNode.refs.usage.length }} place(s)
          </div>
        </div>
        <ul
            v-if="Array.isArray(selectedNode.refs.usage) && selectedNode.refs.usage.length"
            class="mt-1 max-h-24 overflow-auto rounded border border-zinc-200 text-[10px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
        >
          <li
              v-for="(u, i) in selectedNode.refs.usage.slice(0, 8)"
              :key="i"
              class="border-b border-zinc-200 px-1.5 py-0.5 last:border-b-0 dark:border-zinc-800"
          >
            <div class="truncate">{{ u.filePath }}</div>
            <div v-if="u.range" class="text-zinc-400">@ {{ formatRange(u.range) }}</div>
          </li>
        </ul>
      </div>

      <!-- IO Editors -->
      <label class="mb-0.5 block font-semibold text-zinc-700 dark:text-zinc-200">In:</label>
      <ul class="flex flex-col">
        <li v-for="input in filteredInputs" :key="input.name + '-' + input.type"
            class="mb-1 flex items-center gap-1 whitespace-nowrap">
          <input
              v-model="input.name"
              class="w-20 rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              placeholder="name"
          />
          <select
              v-model="input.type"
              class="w-20 appearance-none rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
            <option v-if="!typeOptions.includes(input.type)" :value="input.type">{{ input.type }}</option>
          </select>
          <input
              v-model="input.type"
              class="w-24 rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              placeholder="type"
          />
          <button
              class="rounded-sm bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
              title="Remove"
              @click="removeInput(localInputs.indexOf(input))"
          >
            ✕
          </button>
        </li>
      </ul>
      <button
          class="mb-2 rounded-sm bg-zinc-200 px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
          title="Add Input"
          @click="addInput"
      >
        + In
      </button>
      <label class="mb-0.5 block font-semibold text-zinc-700 dark:text-zinc-200">Out:</label>
      <ul class="flex flex-col">
        <li v-for="output in filteredOutputs" :key="output.name + '-' + output.type"
            class="mb-1 flex items-center gap-1 whitespace-nowrap">
          <input
              v-model="output.name"
              class="w-20 rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              placeholder="name"
          />
          <select
              v-model="output.type"
              class="w-20 appearance-none rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
            <option v-if="!typeOptions.includes(output.type)" :value="output.type">{{ output.type }}</option>
          </select>
          <input
              v-model="output.type"
              class="w-24 rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              placeholder="type"
          />
          <button
              class="rounded-sm bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
              title="Remove"
              @click="removeOutput(localOutputs.indexOf(output))"
          >
            ✕
          </button>
        </li>
      </ul>
      <button
          class="mb-3 rounded-sm bg-zinc-200 px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
          title="Add Output"
          @click="addOutput"
      >
        + Out
      </button>
    </div>

    <!-- Variables List Section -->
    <div :class="{ 'mt-2': !!selectedNode }"
         class="flex items-center gap-1 border-t border-zinc-200 px-2 py-1 dark:border-zinc-700">
      <span class="font-semibold text-zinc-700 dark:text-zinc-200">Variables</span>
      <span v-if="variables?.length" :title="variables.length + ' variables'"
            class="ml-auto text-[10px] text-zinc-500 dark:text-zinc-400">{{
          variables.length
        }}</span>
    </div>
    <div class="max-h-56 overflow-y-auto p-1.5">
      <div v-if="!variables || variables.length === 0" class="px-2 py-3 text-[10px] text-zinc-500 dark:text-zinc-400">
        No variables detected.
      </div>
      <ul v-else class="space-y-1">
        <li
            v-for="v in variables"
            :key="v.name"
            class="flex min-w-0 items-center gap-1 rounded-sm bg-zinc-100/60 px-1.5 py-0.5 text-[10px] dark:bg-zinc-800/60"
        >
          <span class="text-amber-500 dark:text-amber-300">$</span>
          <span :title="v.name" class="flex-1 truncate text-zinc-700 dark:text-zinc-200">{{ v.name }}</span>
          <span :title="v.type || 'mixed'" class="ml-auto text-zinc-500 dark:text-zinc-400">{{
              v.type || 'mixed'
            }}</span>
        </li>
      </ul>
      <!-- Add Variable Form -->
      <div class="mt-2 grid grid-cols-5 items-end gap-1">
        <div class="col-span-2">
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Name</label>
          <input
              v-model="newVarName"
              class="w-full rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              placeholder="myVar"
          />
        </div>
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Type</label>
          <select
              v-model="newVarType"
              class="w-full rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Action</label>
          <select
              v-model="newVarAction"
              class="w-full rounded-sm border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            <option value="get">get</option>
            <option value="set">set</option>
          </select>
        </div>
        <div>
          <button
              class="w-full rounded-sm bg-emerald-600 px-2 py-1 text-[11px] text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
              @click="createVariable"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, ref, watch} from 'vue';
import {nodes, selectedNodeId} from '../../utils/state.js';
import {updateNode, updateNodeIO} from '../../utils/nodes-core.js';
import {closeSettings, selectNode} from '../../utils/node-selection.js';
import {addVariableNode} from '../../utils/node-creation.js';

const props = defineProps({variables: {type: Array, default: () => []}});

// Selected node reactive reference
const selectedNode = computed(() => nodes.value.find((n) => n.id === selectedNodeId.value) || null);

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
  return (ioArr || []).map((io) => (typeof io === 'object' ? {...io} : {name: io, type: ''}));
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
    {immediate: true}
);

const filteredInputs = computed(() => localInputs.value.filter((inp) => String(inp.type).toLowerCase() !== 'exec'));
const filteredOutputs = computed(() => localOutputs.value.filter((out) => String(out.type).toLowerCase() !== 'exec'));

function addInput() {
  localInputs.value.push({name: 'Input', type: ''});
}

function removeInput(i) {
  localInputs.value.splice(i, 1);
}

function addOutput() {
  localOutputs.value.push({name: 'Output', type: ''});
}

function removeOutput(i) {
  localOutputs.value.splice(i, 1);
}

function save() {
  const n = selectedNode.value;
  if (!n) return;
  updateNodeIO({
    id: n.id,
    inputs: localInputs.value.map((io) => ({...io})),
    outputs: localOutputs.value.map((io) => ({...io}))
  });
  const updates = {id: n.id, name: localName.value, x: localX.value, y: localY.value};
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
    selectNode({id: node.id});
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
