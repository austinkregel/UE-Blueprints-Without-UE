import { ref } from 'vue';

// Viewport state for infinite canvas
export const viewport = ref({
    x: 0, // Current viewport offset X
    y: 0, // Current viewport offset Y
    zoom: 1.0 // Current zoom level
});

// Canvas offset (top-left of the canvas area relative to the page/client)
export const canvasOffset = ref({ x: 0, y: 0 });

export function setCanvasOffset(x, y) {
    canvasOffset.value = { x, y };
}

// Panning state
export const isPanning = ref(false);
export const panStart = ref({ x: 0, y: 0 });
export const panOffset = ref({ x: 0, y: 0 });

// Suppress the next contextmenu event if a right-drag (pan) occurred
export const suppressNextContextMenu = ref(false);

/**
 * Convert screen (client) coordinates to world coordinates
 */
export function screenToWorld(screenX, screenY) {
    return {
        x: (screenX - canvasOffset.value.x - viewport.value.x) / viewport.value.zoom,
        y: (screenY - canvasOffset.value.y - viewport.value.y) / viewport.value.zoom
    };
}

/**
 * Convert world coordinates to screen (client) coordinates
 */
export function worldToScreen(worldX, worldY) {
    return {
        x: worldX * viewport.value.zoom + viewport.value.x + canvasOffset.value.x,
        y: worldY * viewport.value.zoom + viewport.value.y + canvasOffset.value.y
    };
}

/**
 * Start panning the viewport
 */
export function startPanning(clientX, clientY) {
    isPanning.value = true;
    panStart.value = { x: clientX, y: clientY };
    panOffset.value = { x: viewport.value.x, y: viewport.value.y };
}

/**
 * Update viewport position during panning
 */
export function updatePanning(clientX, clientY) {
    if (!isPanning.value) return;

    const deltaX = clientX - panStart.value.x;
    const deltaY = clientY - panStart.value.y;

    viewport.value.x = panOffset.value.x + deltaX;
    viewport.value.y = panOffset.value.y + deltaY;
}

/**
 * Stop panning the viewport
 */
export function stopPanning() {
    isPanning.value = false;
}

/**
 * Set zoom level and optionally center on a point
 */
export function setZoom(newZoom, centerX = null, centerY = null) {
    const oldZoom = viewport.value.zoom;
    viewport.value.zoom = Math.max(0.1, Math.min(3.0, newZoom));

    // If center point provided, zoom towards that point
    if (centerX !== null && centerY !== null) {
        const zoomFactor = viewport.value.zoom / oldZoom;
        viewport.value.x = centerX - (centerX - viewport.value.x) * zoomFactor;
        viewport.value.y = centerY - (centerY - viewport.value.y) * zoomFactor;
    }
}

/**
 * Reset viewport to default state
 */
export function resetViewport() {
    viewport.value.x = 0;
    viewport.value.y = 0;
    viewport.value.zoom = 1.0;
    isPanning.value = false;
}

/**
 * Get CSS transform string for the viewport
 */
export function getViewportTransform() {
    return `translate(${viewport.value.x}px, ${viewport.value.y}px) scale(${viewport.value.zoom})`;
}
