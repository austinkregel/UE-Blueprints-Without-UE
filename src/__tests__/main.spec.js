import { describe, it, expect, beforeEach, vi } from 'vitest';
// stub node-globals and css imports
vi.mock('../shims/node-globals.js', () => ({}));
vi.mock('../assets/tailwind.css', () => ({}));

describe('main.js', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="app"></div>';
    });

    it('mounts App component without error', async () => {
        // dynamic import triggers app mounting
        await import('../main.js');
        const appEl = document.getElementById('app');
        expect(appEl).not.toBeNull();
        // basic check: App root uses flex layout
        expect(appEl.innerHTML).toContain('flex');
    });
});
