import { afterEach, describe, expect, it } from 'vitest';
import { installPluginGlobal } from '../plugin-host.js';
import { getNodeIssues, getNodePreview, registerNodePreviewProvider } from '../node-inspector.js';

describe('plugin-host', () => {
    afterEach(() => {
        registerNodePreviewProvider(null);
        delete window.registerBlueprintPlugin;
    });

    it('exposes registerBlueprintPlugin and hands plugins the generic API', () => {
        installPluginGlobal();
        expect(typeof window.registerBlueprintPlugin).toBe('function');

        window.registerBlueprintPlugin((api) => {
            api.registerNodeValidator((node) => (node.id === 42 ? [{ level: 'error', title: 'plugged-in' }] : []));
            api.registerNodePreviewProvider((node) => ({ html: `preview-${node.id}` }));
        });

        expect(getNodePreview({ id: 1 })).toEqual({ html: 'preview-1' });
        expect(getNodeIssues({ id: 42, inputs: [] }, { connections: [] }).some((i) => i.title === 'plugged-in')).toBe(true);
    });

    it('a plugin fn that throws does not break the host', () => {
        installPluginGlobal();
        expect(() =>
            window.registerBlueprintPlugin(() => {
                throw new Error('boom');
            })
        ).not.toThrow();
    });

    it('ignores non-function plugin registrations', () => {
        installPluginGlobal();
        expect(() => window.registerBlueprintPlugin(null)).not.toThrow();
    });
});
