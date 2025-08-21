import {ioPositions} from './state.js';

export function getIOPosition(nodeId, ioType, ioName) {
    const nodeIO = ioPositions.value[nodeId];
    if (!nodeIO) return null;
    const ioGroup = ioType === 'input' ? nodeIO.inputs : nodeIO.outputs;
    if (!ioGroup) return null;
    return ioGroup[ioName] || null;
}
