import { AnchoredWindow } from '../windows/AnchoredWindow';

import type { CameraPresetController } from '../../../app/features/camera/cameraPresetController';

export type CameraPresetsPanel = {
  window: AnchoredWindow;
  dispose(): void;
};

export type CreateCameraPresetsPanelArgs = {
  controller: CameraPresetController;
};

export function createCameraPresetsPanel(args: CreateCameraPresetsPanelArgs): CameraPresetsPanel {
  const w = new AnchoredWindow({
    id: 'camera-presets',
    title: 'Camera',
    anchor: 'UPPER_MIDDLE',
    offsets: { top: 10 },
    minimizable: true,
    startMinimized: false,
    className: 'ts-window--camera-presets',
  });

  const root = document.createElement('div');
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.gap = '8px';

  const hint = document.createElement('div');
  hint.style.opacity = '0.85';
  hint.textContent = 'Presets (deterministic):';

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr 1fr 1fr';
  grid.style.gap = '6px';

  const status = document.createElement('div');
  status.style.opacity = '0.85';

  const buttonsById = new Map<string, HTMLButtonElement>();

  function renderActive(activeId: string): void {
    status.textContent = `Active: ${activeId}`;
    buttonsById.forEach((btn, id) => {
      const isActive = id === activeId;
      btn.style.opacity = isActive ? '1' : '0.75';
      btn.style.border = isActive
        ? '1px solid rgba(255,255,255,0.40)'
        : '1px solid rgba(255,255,255,0.18)';
    });
  }

  args.controller.listPresets().forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = p.label;
    btn.title = p.description;
    btn.style.padding = '6px 8px';
    btn.style.borderRadius = '6px';
    btn.addEventListener('click', () => {
      args.controller.apply(p.id);
    });

    buttonsById.set(p.id, btn);
    grid.appendChild(btn);
  });

  root.appendChild(hint);
  root.appendChild(grid);
  root.appendChild(status);

  w.setContent(root);

  const unsub = args.controller.subscribe((id) => renderActive(id));
  renderActive(args.controller.getActive());

  return {
    window: w,
    dispose() {
      unsub();
      w.destroy();
    },
  };
}
