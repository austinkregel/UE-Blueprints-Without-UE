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

    it('toggles NodePalette visibility when TopToolbar emits toggle-palette', async () => {
        const toolbar = wrapper.findComponent({ name: 'TopToolbar' });
        expect(toolbar.exists()).toBe(true);
        // emit toggle-palette event from stub
        toolbar.vm.$emit('toggle-palette');
        await nextTick();
        // expect node-palette to be hidden
        expect(wrapper.find('node-palette-stub').exists()).toBe(false);
        // emit toggle-palette again
        toolbar.vm.$emit('toggle-palette');
        await nextTick();
        // expect node-palette to be visible again
        expect(wrapper.find('node-palette-stub').exists()).toBe(true);
    });

    it('passes debugMode prop to TopToolbar', () => {
        const toolbar = wrapper.findComponent({ name: 'TopToolbar' });
        // debugMode is a ref(boolean) in state, default true
        expect(toolbar.props().debugMode).toBe(true);
    });
});
