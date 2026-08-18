import { nextTick, onBeforeUnmount, onMounted } from 'vue';
import { ioPositions, log } from './state.js';
import { registerAllIOForNode } from './io-utils.js';

export function construction(emit, props, nodeRef) {
    // Helper to get IO elements for a node
    function getIOElements(type) {
        return nodeRef.value?.querySelectorAll('.io.' + type) || [];
    }

    function startDrag(e) {
        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', stopDrag);
        emit('drag-start', e);
    }

    async function onDrag(e) {
        emit('move', { id: props.node.id, x: e.clientX, y: e.clientY });
        await nextTick(registerAllIO);
    }

    function stopDrag() {
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
        emit('drag-end');
    }

    let connecting = null;

    async function startConnect(type, io) {
        log('startConnect', { type, io });
        connecting = { type, name: io.name || io };
        // Add listener synchronously before awaiting
        window.addEventListener('mouseup', finishConnect);
        await nextTick(registerAllIO);
        const elList = getIOElements(type);
        const idx = (type === 'input' ? props.node.inputs : props.node.outputs).findIndex((x) => (x.name || x) === (io.name || io));
        if (elList[idx]) {
            const rect = elList[idx].getBoundingClientRect();
            log('startConnect rect', { rect, idx });
            emit('start-connection-drag', {
                nodeId: props.node.id,
                ioType: type,
                ioName: io.name || io,
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                ioTypeForHighlight: io.type || ((io.name || io) === 'Exec' || (io.name || io) === 'exec' ? 'Exec' : 'data')
            });
        }
        window.addEventListener('mouseup', finishConnect);
        highlightValidTargets(type, io);
    }

    function highlightValidTargets(type, io) {
        document.querySelectorAll('.io.valid-target').forEach((el) => el.classList.remove('valid-target'));
        log('Highlighting valid targets for', { type, io });
        const isExec = (x) =>
            x?.type === 'Exec' || x === 'Exec' || (x?.name || x) === 'Exec' || x?.type === 'exec' || x === 'exec' || (x?.name || x) === 'exec';
        const lookingForExec = isExec(io);
        document.querySelectorAll('.io.' + (type === 'input' ? 'output' : 'input')).forEach((el) => {
            const label = el.querySelector('.io-label')?.textContent?.trim() || el.textContent?.trim();
            const typeText = el.querySelector('.io-type')?.textContent?.replace(':', '').trim();
            const isExecPin = typeText === 'Exec' || label === 'Exec' || typeText === 'exec' || label === 'exec';
            el.classList.remove('valid-target');
            if ((lookingForExec && isExecPin) || (!lookingForExec && !isExecPin)) {
                el.classList.add('valid-target');
            }
        });
    }

    function clearHighlights() {
        log('Clearing highlights');
        document.querySelectorAll('.io.valid-target').forEach((el) => el.classList.remove('valid-target'));
    }

    function connKey(conn) {
        return `${conn.from?.nodeId ?? ''}:${conn.from?.output ?? ''}->${conn.to?.nodeId ?? ''}:${conn.to?.input ?? ''}`;
    }

    function onIOContextMenu(type, io, event) {
        event.preventDefault();
        log('Opening IO context menu', { type, io, nodeId: props.node.id });
        emit('io-context-menu', {
            nodeId: props.node.id,
            type,
            ioName: io.name || io,
            event
        });
    }

    function getConnectionPoints(conn) {
        if (!conn.from || !conn.to) return null;
        const from = ioPositions.value[conn.from.nodeId]?.outputs?.[conn.from.output];
        const to = ioPositions.value[conn.to.nodeId]?.inputs?.[conn.to.input];
        if (!from || !to) return null;
        return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
    }

    function finishConnect(e) {
        log('finishConnect', { connecting, mouseX: e.clientX, mouseY: e.clientY });
        if (connecting) {
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            let found = null;
            document.querySelectorAll('.io.input, .io.output').forEach((el) => {
                const rect = el.getBoundingClientRect();
                if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
                    const isInput = el.classList.contains('input');
                    const type = isInput ? 'input' : 'output';
                    const nodeEl = el.closest('[data-node-id]');
                    const nodeId = nodeEl ? Number(nodeEl.getAttribute('data-node-id')) : undefined;
                    const ioName = el.querySelector('.io-label')?.textContent?.trim() || el.textContent?.trim();
                    found = { type, nodeId, ioName };
                    log('finishConnect foundIO', found);
                }
            });
            if (found && found.nodeId !== undefined) {
                log('finishConnect found valid node', found);
                if ((connecting.type === 'output' && found.type === 'input') || (connecting.type === 'input' && found.type === 'output')) {
                    if (connecting.type === 'output') {
                        emit('connect', {
                            from: { nodeId: props.node.id, output: connecting.name },
                            to: { nodeId: found.nodeId, input: found.ioName }
                        });
                    } else {
                        emit('connect', {
                            from: { nodeId: found.nodeId, output: found.ioName },
                            to: { nodeId: props.node.id, input: connecting.name }
                        });
                    }
                }
            }
        }
        connecting = null;
        clearHighlights();
        window.removeEventListener('mouseup', finishConnect);
    }

    function registerAllIO() {
        nextTick(() => {
            registerAllIOForNode(props.node, nodeRef.value);
        });
    }

    onMounted(() => {
        registerAllIO();
    });
    onBeforeUnmount(() => {
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
        window.removeEventListener('mouseup', finishConnect);
    });

    return {
        nodeRef,
        registerAllIO,
        startDrag,
        onDrag,
        stopDrag,
        startConnect,
        connKey,
        onIOContextMenu,
        getConnectionPoints,
        renderDebugMarkers: () => null
    };
}
