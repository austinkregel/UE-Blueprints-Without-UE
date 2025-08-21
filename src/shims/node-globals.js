// Provide minimal Node globals for browser build (Tauri WebView)
import processPolyfill from 'process';
import {Buffer as BufferPolyfill} from 'buffer';

if (typeof globalThis.process === 'undefined') {
    // eslint-disable-next-line no-undef
    globalThis.process = processPolyfill;
}
if (typeof globalThis.Buffer === 'undefined') {
    // eslint-disable-next-line no-undef
    globalThis.Buffer = BufferPolyfill;
}
