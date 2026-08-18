import { afterEach, describe, expect, it } from 'vitest';
import { getNodeIssues, getNodePreview, registerNodePreviewProvider, registerNodeValidator } from '../node-inspector.js';

describe('node-inspector', () => {
    afterEach(() => {
        // reset the singleton preview provider between tests
        registerNodePreviewProvider(null);
    });

    it('does not surface "unset input" noise by default (unfinished ≠ broken)', () => {
        const node = { id: 1, inputs: [{ name: 'nQuota', type: 'int' }] };
        expect(getNodeIssues(node, { connections: [] })).toHaveLength(0);
    });

    it('does not flag an input that has a value', () => {
        const node = { id: 1, inputs: [{ name: 'nQuota', type: 'int', defaultValue: 5 }] };
        expect(getNodeIssues(node, { connections: [] })).toHaveLength(0);
    });

    it('does not flag an input that is connected', () => {
        const node = { id: 1, inputs: [{ name: 'target', type: 'object' }] };
        const connections = [{ from: { nodeId: 2, output: 'value' }, to: { nodeId: 1, input: 'target' } }];
        expect(getNodeIssues(node, { connections })).toHaveLength(0);
    });

    it('does not surface "no incoming execution" noise for an unwired node by default', () => {
        const node = { id: 1, inputs: [{ name: 'Exec', type: 'exec' }] };
        const issues = getNodeIssues(node, { connections: [] });
        expect(issues.some((i) => i.title === 'No incoming execution')).toBe(false);
        expect(issues).toHaveLength(0);
    });

    it('runs registered validators and survives one that throws', () => {
        registerNodeValidator(() => {
            throw new Error('boom');
        });
        registerNodeValidator((node) => [{ level: 'error', title: `custom:${node.id}` }]);
        const node = { id: 7, inputs: [] };
        const issues = getNodeIssues(node, { connections: [] });
        expect(issues.some((i) => i.title === 'custom:7')).toBe(true);
    });

    it('returns a registered preview, or null with no provider', () => {
        const node = { id: 1 };
        expect(getNodePreview(node)).toBeNull();
        registerNodePreviewProvider((n) => ({ html: `<b>${n.id}</b>` }));
        expect(getNodePreview(node)).toEqual({ html: '<b>1</b>' });
    });
});
