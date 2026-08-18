// Polyfill minimal Node globals for browser/Tauri
import './assets/tailwind.css';
import { createApp } from 'vue';
import App from './App.vue';

// The editor commits to a single dark game-scripting world.
document.documentElement.classList.add('dark');

createApp(App).mount('#app');
