import { beforeEach, describe, expect, it, vi } from 'vitest';
import { construction } from '../node-interaction.js';

function makeEl({ left = 0, top = 0, width = 100, height = 20, label = 'in', typeText = 'int', classes = [], nodeId = 2 } = {}) {
    const classSet = new Set(classes);
    return {
        classList: {
            add: (c) => classSet.add(c),
            remove: (c) => classSet.delete(c),
            contains: (c) => classSet.has(c)
        },
        getBoundingClientRect: () => ({ left, top, width, height, right: left + width, bottom: top + height }),
        querySelector: (sel) => (sel === '.io-label' ? { textContent: label } : sel === '.io-type' ? { textContent: typeText } : null),
        textContent: label,
        closest: (sel) => (sel === '[data-node-id]' ? { getAttribute: () => String(nodeId) } : null)
    };
}

describe('node-interaction', () => {
    let emitted;
    let nodeRef;
    const props = { node: { id: 1, inputs: [{ name: 'in', type: 'int' }], outputs: [{ name: 'out', type: 'int' }] } };

    beforeEach(() => {
        emitted = [];
        nodeRef = {
            value: {
                querySelectorAll: (sel) => {
                    if (sel === '.io.output')
                        return [
                            makeEl({
                                left: 50,
                                top: 50,
                                label: 'out',
                                typeText: 'int',
                                classes: ['io', 'output']
                            })
                        ];
                    if (sel === '.io.input')
                        return [
                            makeEl({
                                left: 300,
                                top: 50,
                                label: 'in',
                                typeText: 'int',
                                classes: ['io', 'input']
                            })
                        ];
                    return [];
                }
            }
        };
        // Stub document-level querySelectorAll used by highlight/finishConnect
        vi.spyOn(document, 'querySelectorAll').mockImplementation((sel) => {
            if (sel === '.io.valid-target') {
                // Return a valid input element for connect
                return [
                    makeEl({
                        left: 300,
                        top: 50,
                        label: 'in',
                        typeText: 'int',
                        classes: ['io', 'input', 'valid-target']
                    })
                ];
            }
            if (sel === '.io.input, .io.output') {
                const input = makeEl({ left: 300, top: 50, label: 'in', typeText: 'int', classes: ['io', 'input'] });
                return [input];
            }
            if (sel.startsWith('.io.')) {
                const isInput = sel.includes('input');
                return [
                    makeEl({
                        left: isInput ? 300 : 50,
                        top: 50,
                        label: isInput ? 'in' : 'out',
                        typeText: 'int',
                        classes: ['io', isInput ? 'input' : 'output']
                    })
                ];
            }
            return [];
        });
    });

    function emit(evt, payload) {
        emitted.push({ evt, payload });
    }

    it('startConnect and finishConnect emit connect event when hovering a matching target', () => {
        const api = construction(emit, props, nodeRef);
        // Start from output pin
        api.startConnect('output', { name: 'out', type: 'int' });
        // Simulate mouseup over input rect
        api.onIOContextMenu(
            'input',
            { name: 'in' },
            {
                preventDefault: () => {},
                clientX: 0
            }
        ); // also cover context menu path briefly
        // Call finishConnect with mouse over input area

        // Directly call internal finishConnect via window listener is tricky; call returned api render functions that reference finishConnect indirectly
        // We can trigger finishConnect by dispatching window mouseup since listener is attached
        window.dispatchEvent(new MouseEvent('mouseup', { clientX: 310, clientY: 55 }));
        const connectEvents = emitted.filter((e) => e.evt === 'connect');
        expect(connectEvents.length).toBeGreaterThan(0);
        const c = connectEvents[0].payload;
        expect(c.from).toEqual({ nodeId: 1, output: 'out' });
        expect(c.to).toEqual({ nodeId: 2, input: 'in' });
    });

    it('connKey formats correctly and getConnectionPoints returns null when missing', () => {
        const api = construction(emit, props, nodeRef);
        const key = api.connKey({ from: { nodeId: 1, output: 'A' }, to: { nodeId: 2, input: 'B' } });
        expect(key).toBe('1:A->2:B');
        expect(api.getConnectionPoints({ from: { nodeId: 1, output: 'x' }, to: { nodeId: 2, input: 'y' } })).toBeNull();
    });
});
