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
        // NOTE: The right-sidebar NodePalette is always rendered; it is not gated by
        // `showNodePalette`. The `showNodePalette` flag is instead passed down to
        // TopToolbar via the `show-node-palette` prop, so we assert the toggle through
        // that prop. Intent preserved: emitting toggle-palette flips palette visibility.
        const toolbar = wrapper.findComponent({ name: 'TopToolbar' });
        expect(toolbar.exists()).toBe(true);
        // initial state: showNodePalette is ref(false)
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
        // debugMode is a ref(boolean) in state, default true
        expect(toolbar.props().debugMode).toBe(true);
    });
});
