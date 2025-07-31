<template>
  <div
    class="absolute inline-block min-w-[120px] max-w-[420px] p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg text-white font-sans text-sm select-none cursor-grab"
    :style="{ left: node.x + 'px', top: node.y + 'px' }"
    :data-node-id="node.id"
    ref="nodeRef"
    @mousedown.stop="startDrag"
    @click.stop="selectNode"
  >
    <svg class="absolute top-0 left-0 w-full h-full pointer-events-none z-10" width="100%" height="100%">
      <g v-for="conn in nodeConnections" :key="connKey(conn)">
        <line
          v-if="getConnectionPoints(conn)"
          :x1="getConnectionPoints(conn).x1"
          :y1="getConnectionPoints(conn).y1"
          :x2="getConnectionPoints(conn).x2"
          :y2="getConnectionPoints(conn).y2"
          stroke="#0ff" stroke-width="3" />
      </g>
    </svg>
    <div class="bg-zinc-700 px-3 py-1.5 rounded-t-lg font-bold">
      <slot name="header">Node {{ node.id }}</slot>
    </div>
    <div class="flex justify-between p-2 gap-4">
      <div class="flex flex-col gap-1 inputs">
        <div
          v-for="input in node.inputs"
          :key="input.name || input"
          class="io input bg-zinc-600 px-1.5 py-0.5 rounded text-xs flex items-center cursor-pointer"
          @mousedown.stop.prevent="startConnect('input', input)"
          @contextmenu="onIOContextMenu('input', input, $event)"
        >
          ● <span class="mx-0.5 io-label">{{ input.name || input }}</span>
          <span v-if="input.type" class="io-type text-cyan-300 text-[0.85em] ml-0.5">: {{ input.type }}</span>
        </div>
        <slot name="inputs"></slot>
      </div>
      <div class="flex flex-col gap-1 outputs">
        <div
          v-for="output in node.outputs"
          :key="output.name || output"
          class="io output bg-zinc-600 px-1.5 py-0.5 rounded text-xs flex items-center cursor-pointer justify-end"
          @mousedown.stop.prevent="startConnect('output', output)"
          @contextmenu="onIOContextMenu('output', output, $event)"
        >
          <span class="io-label mx-0.5">{{ output.name || output }}</span>
          <span v-if="output.type" class="io-type text-cyan-300 text-[0.85em] ml-0.5">: {{ output.type }}</span> ●
        </div>
        <slot name="outputs"></slot>
      </div>
    </div>
    <slot></slot>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, onMounted, nextTick, computed } from 'vue';
const props = defineProps({
  node: Object,
  connections: Array,
});
const emit = defineEmits(['move', 'connect', 'select', 'register-io', 'start-connection-drag']);

let dragging = false;
let offset = { x: 0, y: 0 };
const nodeRef = ref();

onMounted(() => {
  nextTick(registerAllIO);
});

function getIOElements(type) {
  return nodeRef.value?.querySelectorAll('.io.' + type) || [];
}

function registerAllIO() {
  // Register all input/output positions
  ['input', 'output'].forEach(type => {
    getIOElements(type).forEach((el, idx) => {
      const io = (type === 'input' ? props.node.inputs : props.node.outputs)[idx];
      if (!io) return;
      const rect = el.getBoundingClientRect();
      // Use the correct IO name for exec pins
      const ioName = io.name || io;
      emit('register-io', {
        nodeId: props.node.id,
        type,
        name: ioName,
        x: rect.left + rect.width / 2 + window.scrollX,
        y: rect.top + rect.height / 2 + window.scrollY,
      });
    });
  });
}

function startDrag(e) {
  dragging = true;
  offset.x = e.clientX - props.node.x;
  offset.y = e.clientY - props.node.y;
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}
function onDrag(e) {
  if (!dragging) return;
  emit('move', { id: props.node.id, x: e.clientX - offset.x, y: e.clientY - offset.y });
  // Re-register IO positions after moving
  nextTick(registerAllIO);
}
function stopDrag() {
  dragging = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}

let connecting = null;
function startConnect(type, io) {
  connecting = { type, name: io.name || io };
  nextTick(registerAllIO);
  // Notify editor to start connection drag
  const elList = getIOElements(type);
  let idx = (type === 'input' ? props.node.inputs : props.node.outputs).findIndex(x => (x.name || x) === (io.name || io));
  if (elList[idx]) {
    const rect = elList[idx].getBoundingClientRect();
    emit('start-connection-drag', {
      nodeId: props.node.id,
      ioType: type,
      ioName: io.name || io,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      ioTypeForHighlight: io.type || ((io.name || io) === 'Exec' ? 'Exec' : 'data'),
    });
  }
  window.addEventListener('mouseup', finishConnect);
  // Highlight valid targets
  highlightValidTargets(type, io);
}

function highlightValidTargets(type, io) {
  // Remove previous highlights
  document.querySelectorAll('.io.valid-target').forEach(el => el.classList.remove('valid-target'));
  const isExec = (x) => (x.type === 'Exec' || x === 'Exec' || (x.name || x) === 'Exec');
  const lookingForExec = isExec(io);
  // Only highlight compatible pins on ALL nodes
  document.querySelectorAll('.io.' + (type === 'input' ? 'output' : 'input')).forEach((el) => {
    // Try to get the type from the DOM element's text
    const label = el.querySelector('.io-label')?.textContent?.trim() || el.textContent?.trim();
    const typeText = el.querySelector('.io-type')?.textContent?.replace(':', '').trim();
    const isExecPin = (typeText === 'Exec' || label === 'Exec');
    // Always allow highlighting for visual feedback, but only allow connect logic in finishConnect
    el.classList.remove('valid-target');
    if ((lookingForExec && isExecPin) || (!lookingForExec && !isExecPin)) {
      el.classList.add('valid-target');
    }
  });
}

function clearHighlights() {
  document.querySelectorAll('.io.valid-target').forEach(el => el.classList.remove('valid-target'));
}

function finishConnect(e) {
  if (connecting) {
    // Find the IO pin under the mouse (across all nodes)
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    let found = null;
    document.querySelectorAll('.io.input, .io.output').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (
        mouseX >= rect.left && mouseX <= rect.right &&
        mouseY >= rect.top && mouseY <= rect.bottom
      ) {
        // Determine type and index
        const isInput = el.classList.contains('input');
        const type = isInput ? 'input' : 'output';
        // Find the node id and io name from DOM tree
        let nodeEl = el.closest('[data-node-id]');
        let nodeId = nodeEl ? Number(nodeEl.getAttribute('data-node-id')) : undefined;
        let ioName = el.querySelector('.io-label')?.textContent?.trim() || el.textContent?.trim();
        found = { type, nodeId, ioName };
        console.log('finishConnect found:', found);
      }
    });
    if (found && found.nodeId !== undefined) {
      // Only allow output->input or input->output, and exec pins only to exec pins
      if (
        (connecting.type === 'output' && found.type === 'input') ||
        (connecting.type === 'input' && found.type === 'output')
      ) {
        // More robust exec pin check: case-insensitive, allow type property
        const isExec = (x) => {
          if (!x) return false;
          if (typeof x === 'string') return x.trim().toLowerCase() === 'exec';
          if (typeof x === 'object' && x.type) return String(x.type).trim().toLowerCase() === 'exec';
          return false;
        };
        if (
          (isExec(found.ioName) && isExec(connecting.name)) ||
          (!isExec(found.ioName) && !isExec(connecting.name))
        ) {
          if (connecting.type === 'output') {
            console.log('Emitting connect (output):', {
              from: { nodeId: props.node.id, output: connecting.name },
              to: { nodeId: found.nodeId, input: found.ioName },
            });
            emit('connect', {
              from: { nodeId: props.node.id, output: connecting.name },
              to: { nodeId: found.nodeId, input: found.ioName },
            });
          } else {
            console.log('Emitting connect (input):', {
              from: { nodeId: found.nodeId, output: found.ioName },
              to: { nodeId: props.node.id, input: connecting.name },
            });
            emit('connect', {
              from: { nodeId: found.nodeId, output: found.ioName },
              to: { nodeId: props.node.id, input: connecting.name },
            });
          }
        } else {
          console.log('Exec pin mismatch:', found.ioName, connecting.name);
        }
      } else {
        console.log('Connection type mismatch:', connecting.type, found.type);
      }
    } else {
      console.log('No valid IO found under mouse for connection.');
    }
  }
  connecting = null;
  clearHighlights();
  window.removeEventListener('mouseup', finishConnect);
}

function connKey(conn) {
  // Create a unique key for a connection based on node and IO names
  return `${conn.from?.nodeId ?? ''}:${conn.from?.output ?? ''}->${conn.to?.nodeId ?? ''}:${conn.to?.input ?? ''}`;
}

function getConnectionPoints(conn) {
  // Use the same logic as NodeEditor.vue to get IO positions from props
  const from = props.connections && conn.from?.nodeId !== undefined && conn.from?.output !== undefined
    ? document.querySelector(`[data-node-id='${conn.from.nodeId}'] .io.output .io-label:contains('${conn.from.output}')`)
    : null;
  const to = props.connections && conn.to?.nodeId !== undefined && conn.to?.input !== undefined
    ? document.querySelector(`[data-node-id='${conn.to.nodeId}'] .io.input .io-label:contains('${conn.to.input}')`)
    : null;
  if (!from || !to) return null;
  const fromRect = from.getBoundingClientRect();
  const toRect = to.getBoundingClientRect();
  return {
    x1: fromRect.left + fromRect.width / 2 + window.scrollX,
    y1: fromRect.top + fromRect.height / 2 + window.scrollY,
    x2: toRect.left + toRect.width / 2 + window.scrollX,
    y2: toRect.top + toRect.height / 2 + window.scrollY
  };
}

const nodeConnections = computed(() => {
  // Only show connections where this node is the source or target
  if (!props.connections) return [];
  return props.connections.filter(conn =>
    (conn.from && conn.from.nodeId === props.node.id) ||
    (conn.to && conn.to.nodeId === props.node.id)
  );
});
</script>

<style scoped>
.valid-target {
  border: 2px dashed #0ff !important;
  opacity: 1 !important;
}
</style>
