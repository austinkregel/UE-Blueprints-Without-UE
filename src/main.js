// Polyfill minimal Node globals for browser/Tauri
import './assets/tailwind.css';
import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
