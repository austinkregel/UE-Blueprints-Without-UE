import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
    plugins: [
        vue(),
        tailwindcss({}),
        nodePolyfills({
            // include polyfills for global objects
            protocolImports: true,
            globals: {
                process: true,
                buffer: true
            }
        })
    ],
    define: {
        'process.env': {},
        'process.browser': true
    },
    // Ensure dynamically imported deps like 'php-parser' are pre-bundled by Vite
    optimizeDeps: {
        include: ['php-parser', 'process', 'buffer']
    },
    resolve: {
        alias: {
            process: 'process/browser',
            buffer: 'buffer'
        }
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                  protocol: 'ws',
                  host,
                  port: 1421
              }
            : undefined,
        watch: {
            // 3. tell vite to ignore watching `src-tauri`
            ignored: ['**/src-tauri/**']
        }
    }
}));
