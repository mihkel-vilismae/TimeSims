import { AnchoredWindow } from '../windows/AnchoredWindow';
import type { OrbitControlsController } from '../../../app/features/camera/orbitControlsController';

export type OrbitControlsPanel = {
  window: AnchoredWindow;
  dispose(): void;
};

export type CreateOrbitControlsPanelArgs = {
  controller: OrbitControlsController;
};

export function createOrbitControlsPanel(args: CreateOrbitControlsPanelArgs): OrbitControlsPanel {
  const w = new AnchoredWindow({
    id: 'orbit-controls',
    title: 'Orbit',
    anchor: 'UPPER_MIDDLE',
    offsets: { top: 64 },
    minimizable: true,
    startMinimized: true,
    className: 'ts-window--orbit-controls',
  });

  const root = document.createElement('div');
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.gap = '8px';

  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = '8px';

  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = args.controller.isEnabled();
  toggle.disabled = !args.controller.isSupported();

  const label = document.createElement('label');
  label.style.cursor = 'pointer';
  label.style.userSelect = 'none';
  label.textContent = args.controller.isSupported() ? 'Enable OrbitControls' : 'OrbitControls not supported';

  const status = document.createElement('div');
  status.style.opacity = '0.85';

  const hint = document.createElement('div');
  hint.style.opacity = '0.75';
  hint.style.lineHeight = '1.3';
  hint.innerHTML = `
    <div><b>Mouse:</b> Middle-drag = rotate, Wheel = zoom.</div>
    <div><b>Notes:</b> Left-click selection + right-click context menu remain unchanged.</div>
  `;

  function render(enabled: boolean): void {
    toggle.checked = enabled;
    status.textContent = enabled ? 'Status: ON' : 'Status: OFF';
  }

  toggle.addEventListener('change', () => {
    if (toggle.checked) args.controller.enable();
    else args.controller.disable();
  });

  row.appendChild(toggle);
  row.appendChild(label);
  root.appendChild(row);
  root.appendChild(status);
  root.appendChild(hint);

  w.setContent(root);

  const unsub = args.controller.subscribe((enabled) => render(enabled));
  render(args.controller.isEnabled());

  return {
    window: w,
    dispose() {
      unsub();
      w.destroy();
    },
  };
}
