const STYLE_ID = 'timesims-ui-overlay-styles';

/**
 * Injects minimal styles for the windowing framework.
 * Idempotent.
 */
export function ensureOverlayStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.ts-window {
  pointer-events: auto;
  box-sizing: border-box;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(0,0,0,0.55);
  color: #fff;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  border-radius: 8px;
  overflow: hidden;
}
.ts-window__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  cursor: default;
  user-select: none;
  background: rgba(0,0,0,0.35);
}
.ts-window__header--dragging { cursor: grabbing; }
.ts-window__title { font-size: 12px; opacity: 0.9; }
.ts-window__actions { display: flex; gap: 6px; }
.ts-window__minimize {
  pointer-events: auto;
  width: 22px;
  height: 18px;
  font-size: 12px;
}
.ts-window__content {
  padding: 8px;
  font-size: 12px;
  overflow: auto;
  height: calc(100% - 30px);
}
.ts-window--resizable { resize: both; }
.ts-window--floating { box-shadow: 0 6px 20px rgba(0,0,0,0.35); }
.ts-window--minimized { height: auto !important; }
`;

  document.head.appendChild(style);
}
