// Polyfill minimal Node globals for browser/Tauri
import './shims/node-globals.js';
import './assets/tailwind.css';
import {createApp} from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
