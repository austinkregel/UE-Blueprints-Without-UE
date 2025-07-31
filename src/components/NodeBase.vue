<template>
  <div
    class="node"
    :style="{ left: node.x + 'px', top: node.y + 'px' }"
    :data-node-id="node.id"
    ref="nodeRef"
    @mousedown.stop="startDrag"
    @click.stop="selectNode"
  >
    <div class="node-header">
      <slot name="header">Node {{ node.id }}</slot>
    </div>
    <div class="io-list">
      <div class="inputs">
        <div
          v-for="input in node.inputs"
          :key="input.name || input"
          class="io input"
          @mousedown.stop.prevent="startConnect('input', input)"
          @contextmenu="onIOContextMenu('input', input, $event)"
        >
          ● <span class="io-label">{{ input.name || input }}</span>
          <span v-if="input.type" class="io-type">: {{ input.type }}</span>
        </div>
        <slot name="inputs"></slot>
      </div>
      <div class="outputs">
        <div
          v-for="output in node.outputs"
          :key="output.name || output"
          class="io output"
          @mousedown.stop.prevent="startConnect('output', output)"
          @contextmenu="onIOContextMenu('output', output, $event)"
        >
          <span class="io-label">{{ output.name || output }}</span>
          <span v-if="output.type" class="io-type">: {{ output.type }}</span> ●
        </div>
        <slot name="outputs"></slot>
      </div>
    </div>
    <slot></slot>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, onMounted, nextTick } from 'vue';
const props = defineProps({
  node: Object,
  connections: Array,
});
const emit = defineEmits(['move', 'connect', 'select', 'register-io']);

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
        let nodeEl = el.closest('.node');
        let nodeId = nodeEl ? Number(nodeEl.getAttribute('data-node-id')) : undefined;
        let ioName = el.querySelector('.io-label')?.textContent?.trim() || el.textContent?.trim();
        found = { type, nodeId, ioName };
      }
    });
    if (found && found.nodeId !== undefined) {
      // Only allow output->input or input->output, and exec pins only to exec pins
      if (
        (connecting.type === 'output' && found.type === 'input') ||
        (connecting.type === 'input' && found.type === 'output')
      ) {
        const isExec = (x) => (x === 'Exec');
        if (
          (isExec(found.ioName) && isExec(connecting.name)) ||
          (!isExec(found.ioName) && !isExec(connecting.name))
        ) {
          if (connecting.type === 'output') {
            emit('connect', {
              from: { nodeId: props.node.id, output: connecting.name },
              to: { nodeId: found.nodeId, input: found.ioName },
            });
          } else {
            emit('connect', {
              from: { nodeId: found.nodeId, output: found.ioName },
              to: { nodeId: props.node.id, input: connecting.name },
            });
          }
        }
      }
    }
  }
  connecting = null;
  clearHighlights();
  window.removeEventListener('mouseup', finishConnect);
}

// Add right-click to delete connection
function onIOContextMenu(type, io, event) {
  event.preventDefault();
  emit('delete-connection', { nodeId: props.node.id, ioType: type, ioName: io.name || io });
}

function selectNode() {
  emit('select', { id: props.node.id });
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
  window.removeEventListener('mouseup', finishConnect);
});
</script>

<style scoped>
.node {
  position: absolute;
  display: inline-block;
  width: auto;
  min-width: 120px;
  max-width: 420px;
  padding: 10px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  color: #fff;
  font-family: Arial, sans-serif;
  font-size: 14px;
  user-select: none;
  cursor: grab;
}
.node-header {
  background: #444;
  padding: 6px 12px;
  border-radius: 8px 8px 0 0;
  font-weight: bold;
}
.io-list {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  gap: 1em;
}
.inputs, .outputs {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.io {
  background: #555;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.io-label {
  margin: 0 2px;
}
.io-type {
  color: #0ff;
  font-size: 0.85em;
  margin-left: 2px;
}
.input {
  align-items: flex-start;
}
.output {
  align-items: flex-end;
}
.io.valid-target {
  outline: 2px solid #0ff;
  background: #224;
}
</style>
