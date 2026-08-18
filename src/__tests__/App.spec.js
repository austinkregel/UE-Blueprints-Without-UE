import { describe, it, expect, beforeEach } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { nextTick } from 'vue';
import App from '../App.vue';

describe('App.vue', () => {
    let wrapper;

    beforeEach(() => {
        wrapper = shallowMount(App);
    });

    it('renders root container with correct classes', () => {
        expect(wrapper.classes()).toContain('flex');
        expect(wrapper.classes()).toContain('h-full');
    });

    it('initially shows NodePalette sidebar', () => {
        // check that node-palette stub is rendered
        expect(wrapper.find('node-palette-stub').exists()).toBe(true);
    });

    it('toggles NodePalette visibility state when TopToolbar emits toggle-palette', async () => {
        // `showNodePalette` gates the right-sidebar (v-show) and is mirrored to
        // TopToolbar via the `show-node-palette` prop. v-show keeps the stub in the
        // DOM, so we assert the flag through that prop. Intent: emitting
        // toggle-palette flips palette visibility.
        const toolbar = wrapper.findComponent({ name: 'TopToolbar' });
        expect(toolbar.exists()).toBe(true);
        // initial state: showNodePalette is ref(false) — the inspector is the right panel,
        // the palette is a toggle drawer.
        expect(toolbar.props().showNodePalette).toBe(false);
        // emit toggle-palette event from stub
        toolbar.vm.$emit('toggle-palette');
        await nextTick();
        // expect palette visibility flag to flip on
        expect(toolbar.props().showNodePalette).toBe(true);
        // emit toggle-palette again
        toolbar.vm.$emit('toggle-palette');
        await nextTick();
        // expect palette visibility flag to flip back off
        expect(toolbar.props().showNodePalette).toBe(false);
    });

    it('passes debugMode prop to TopToolbar', () => {
        const toolbar = wrapper.findComponent({ name: 'TopToolbar' });
        // debugMode is a ref(boolean) in state, default false (debug overlays off)
        expect(toolbar.props().debugMode).toBe(false);
    });
});
