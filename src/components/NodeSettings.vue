<template>
  <div class="fixed top-0 right-0 h-screen w-[480px] bg-zinc-900 text-white shadow-2xl z-[1000] flex flex-col items-stretch animate-slideIn">
    <div class="p-6 flex-1 flex flex-col overflow-y-auto">
      <h3 class="text-lg font-bold mb-4">Node {{ node.id }} Settings</h3>

      <!-- General -->
      <div class="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label class="block text-xs text-zinc-400">Type</label>
          <input :value="node.type" disabled class="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1" />
        </div>
        <div>
          <label class="block text-xs text-zinc-400">Category</label>
          <input :value="node.category || ''" disabled class="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1" />
        </div>
        <div>
          <label class="block text-xs text-zinc-400">Definition</label>
          <input :value="node.nodeDefId || ''" disabled class="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1" />
        </div>
        <div>
          <label class="block text-xs text-zinc-400">Display Name</label>
          <input v-model="localName" placeholder="(optional)" class="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1" />
        </div>
        <div>
          <label class="block text-xs text-zinc-400">X</label>
          <input type="number" v-model.number="localX" class="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1" />
        </div>
        <div>
          <label class="block text-xs text-zinc-400">Y</label>
          <input type="number" v-model.number="localY" class="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1" />
        </div>
      </div>

      <!-- Variable / Literal specific -->
      <div v-if="node.type === 'variable'" class="mb-4">
        <h4 class="font-semibold mb-2">Variable</h4>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label class="block text-xs text-zinc-400">Action</label>
            <select v-model="localVarAction" class="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1">
              <option value="get">get</option>
              <option value="set">set</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-zinc-400">Type</label>
            <select v-model="localVarType" class="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1">
              <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="block text-xs text-zinc-400">Name</label>
            <input v-model="localVarName" class="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1" />
          </div>
        </div>
        <div v-if="node.isLiteral" class="grid grid-cols-2 gap-2 items-end">
          <div class="col-span-2">
            <label class="block text-xs text-zinc-400">Literal Value</label>
            <input v-if="localVarType === 'string'" v-model="localLiteralValueString" class="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1" />
            <input v-else-if="localVarType === 'int' || localVarType === 'float'" type="number" v-model.number="localLiteralValueNumber" class="w-full bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1" />
            <label v-else-if="localVarType === 'bool'" class="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" v-model="localLiteralValueBool" /> Boolean
            </label>
            <div v-else class="text-xs text-zinc-400">Unsupported literal type</div>
          </div>
        </div>
      </div>

      <!-- Code context for imported code nodes -->
      <div v-if="node?.refs" class="mb-4">
        <h4 class="font-semibold mb-2">Code Context</h4>
        <div class="text-xs text-zinc-300 grid grid-cols-1 gap-1">
          <div><span class="text-zinc-500">File:</span> {{ node.refs.filePath || '—' }}</div>
          <div v-if="node.refs.language"><span class="text-zinc-500">Language:</span> {{ node.refs.language }}</div>
          <div v-if="node.refs.fqn"><span class="text-zinc-500">FQN:</span> {{ node.refs.fqn }}</div>
          <div v-if="Array.isArray(node.refs.usage)">
            <span class="text-zinc-500">Usage:</span> {{ node.refs.usage.length }} place(s)
          </div>
        </div>
        <ul v-if="Array.isArray(node.refs.usage) && node.refs.usage.length" class="mt-2 max-h-28 overflow-auto text-xs text-zinc-400 border border-zinc-700 rounded">
          <li v-for="(u, i) in node.refs.usage.slice(0, 8)" :key="i" class="px-2 py-1 border-b border-zinc-800 last:border-b-0">
            <div class="truncate">{{ u.filePath }}</div>
            <div v-if="u.range" class="text-zinc-500">@ {{ formatRange(u.range) }}</div>
          </li>
        </ul>
      </div>

      <label class="block font-semibold mb-1">Inputs:</label>
      <ul class="flex flex-col">
        <li v-for="input in filteredInputs" :key="input.name + '-' + input.type" class="mb-2 flex items-center gap-2">
          <input v-model="input.name" placeholder="Input name" class="bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 mr-2 mb-0.5 w-28" />
          <select v-model="input.type" class="appearance-none bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 mr-2 mb-0.5 w-28">
            <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
            <option :value="input.type" v-if="!typeOptions.includes(input.type)">{{ input.type }}</option>
          </select>
          <input v-model="input.type" placeholder="Type (e.g. int, string, array)" class="bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 mr-2 mb-0.5 w-32" />
          <button @click="removeInput(localInputs.indexOf(input))" class="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-2 py-1">Remove</button>
        </li>
      </ul>
      <button @click="addInput" class="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-3 py-1 mb-4">Add Input</button>
      <label class="block font-semibold mb-1">Outputs:</label>
      <ul class="flex flex-col">
        <li v-for="output in filteredOutputs" :key="output.name + '-' + output.type" class="mb-2 flex items-center gap-2">
          <input v-model="output.name" placeholder="Output name" class="bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 mr-2 mb-0.5 w-28" />
          <select v-model="output.type" class="appearance-none bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 mr-2 mb-0.5 w-28">
            <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
            <option :value="output.type" v-if="!typeOptions.includes(output.type)">{{ output.type }}</option>
          </select>
          <input v-model="output.type" placeholder="Type (e.g. int, string, array)" class="bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 mr-2 mb-0.5 w-32" />
          <button @click="removeOutput(localOutputs.indexOf(output))" class="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-2 py-1">Remove</button>
        </li>
      </ul>
      <button @click="addOutput" class="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-3 py-1 mb-4">Add Output</button>
      <div class="mt-4 flex gap-2">
        <button @click="save" class="bg-cyan-600 hover:bg-cyan-700 text-white rounded px-4 py-2">Save</button>
        <button @click="$emit('close')" class="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-4 py-2">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
const props = defineProps({ node: Object });
const emit = defineEmits(['close', 'update-io', 'update-node']);
const { node } = props;
const typeOptions = [
  'int', 'float', 'string', 'bool', 'array', 'object', 'callable', 'mixed', 'void', 'resource', 'null'
];

function normalizeIO(ioArr) {
  return ioArr.map(io => typeof io === 'object' ? io : { name: io, type: '' });
}

const localInputs = ref(props.node ? normalizeIO(props.node.inputs) : []);
const localOutputs = ref(props.node ? normalizeIO(props.node.outputs) : []);
const localName = ref(props.node?.name || '');
const localX = ref(props.node?.x || 0);
const localY = ref(props.node?.y || 0);
const localVarName = ref(props.node?.varName || '');
const localVarType = ref(props.node?.varType || 'mixed');
const localVarAction = ref(props.node?.varAction || 'get');
const localLiteralValueString = ref(typeof props.node?.value === 'string' ? props.node.value : '');
const localLiteralValueNumber = ref(typeof props.node?.value === 'number' ? props.node.value : 0);
const localLiteralValueBool = ref(typeof props.node?.value === 'boolean' ? props.node.value : false);

watch(() => props.node, (newNode) => {
  if (newNode) {
    localInputs.value = normalizeIO(newNode.inputs);
    localOutputs.value = normalizeIO(newNode.outputs);
    localName.value = newNode.name || '';
    localX.value = newNode.x || 0;
    localY.value = newNode.y || 0;
    localVarName.value = newNode.varName || '';
    localVarType.value = newNode.varType || 'mixed';
    localVarAction.value = newNode.varAction || 'get';
    localLiteralValueString.value = typeof newNode.value === 'string' ? newNode.value : '';
    localLiteralValueNumber.value = typeof newNode.value === 'number' ? newNode.value : 0;
    localLiteralValueBool.value = typeof newNode.value === 'boolean' ? newNode.value : false;
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
});

const filteredInputs = computed(() => localInputs.value.filter(inp => String(inp.type).toLowerCase() !== 'exec'));
const filteredOutputs = computed(() => localOutputs.value.filter(out => String(out.type).toLowerCase() !== 'exec'));

function addInput() {
  localInputs.value.push({ name: 'Input', type: '' });
}
function removeInput(i) {
  localInputs.value.splice(i, 1);
}
function addOutput() {
  localOutputs.value.push({ name: 'Output', type: '' });
}
function removeOutput(i) {
  localOutputs.value.splice(i, 1);
}
function save() {
  emit('update-io', {
    id: props.node?.id ?? null,
    inputs: localInputs.value.map(io => ({ ...io })),
    outputs: localOutputs.value.map(io => ({ ...io })),
  });
  const updates = {
    id: props.node?.id ?? null,
    name: localName.value,
    x: localX.value,
    y: localY.value
  };
  if (props.node?.type === 'variable') {
    updates.varName = localVarName.value;
    updates.varType = localVarType.value;
    updates.varAction = localVarAction.value;
    if (props.node?.isLiteral) {
      updates.value = localVarType.value === 'string' ? localLiteralValueString.value
        : (localVarType.value === 'bool' ? localLiteralValueBool.value : Number(localLiteralValueNumber.value));
    }
  }
  if (props.node?.type === 'function') {
    updates.funcName = localName.value || props.node?.funcName;
  }
  emit('update-node', updates);
  emit('close');
}

function formatRange(r) {
  try {
    const s = r.start || {}; const e = r.end || {};
    return `${(s.row ?? '?')}:${(s.col ?? '?')} - ${(e.row ?? '?')}:${(e.col ?? '?')}`;
  } catch { return ''; }
}
</script>
