/**
 * Creates (or returns existing) overlay root container.
 * Call explicitly from app/runtime composition root.
 */
export function createOverlayRoot(id = 'ui-overlay-root'): HTMLDivElement {
  const existing = document.getElementById(id);
  if (existing && existing instanceof HTMLDivElement) return existing;

  const root = document.createElement('div');
  root.id = id;

  // Avoid creating a full-screen hit-test box that can accidentally swallow clicks.
  // The overlay root itself is non-interactive; individual windows are fixed-positioned.
  root.style.position = 'fixed';
  root.style.left = '0';
  root.style.top = '0';
  root.style.width = '0';
  root.style.height = '0';
  root.style.pointerEvents = 'none';
  root.style.zIndex = '9999';

  document.body.appendChild(root);
  return root;
}
