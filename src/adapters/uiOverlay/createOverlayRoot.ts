/**
 * Creates (or returns existing) overlay root container.
 * Call explicitly from app/runtime composition root.
 */
export function createOverlayRoot(id = 'ui-overlay-root'): HTMLDivElement {
  const existing = document.getElementById(id);
  if (existing && existing instanceof HTMLDivElement) return existing;

  const root = document.createElement('div');
  root.id = id;
  root.style.position = 'fixed';
  root.style.inset = '0';
  root.style.pointerEvents = 'none';
  root.style.zIndex = '9999';

  document.body.appendChild(root);
  return root;
}
