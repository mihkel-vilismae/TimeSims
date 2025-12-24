import { FloatingWindow } from '../windows/FloatingWindow';
import type { DebugLogPort } from '../DebugLog';
import type { DebugSettingsStore } from '../../../app/state/debugSettings';
import type { DebugCommandRunner } from '../../../app/systems/debugCommands/runDebugCommand';

export type DebugPanel = {
  window: FloatingWindow;
  dispose(): void;
};

export type CreateDebugPanelArgs = {
  log: DebugLogPort;
  settings: DebugSettingsStore;
  runner: DebugCommandRunner;
};

export function createDebugPanel(args: CreateDebugPanelArgs): DebugPanel {
  const w = new FloatingWindow({
    id: 'debug',
    title: 'Debug',
    rect: { x: 12, y: 80, w: 520, h: 260 },
    minimizable: true,
    resizable: true,
    draggable: true,
  });

  const root = document.createElement('div');
  root.className = 'ts-debug-panel';
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.gap = '6px';
  root.style.height = '100%';

  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.gap = '6px';
  controls.style.alignItems = 'center';

  const btnVerbose = document.createElement('button');
  btnVerbose.type = 'button';

  const btnClear = document.createElement('button');
  btnClear.type = 'button';
  btnClear.textContent = 'Clear';

  const input = document.createElement('input');
  (input as any).type = 'text';
  (input as any).placeholder = '/help';
  (input as any).style.flex = '1';

  const btnRun = document.createElement('button');
  btnRun.type = 'button';
  btnRun.textContent = 'Run';

  controls.appendChild(btnVerbose);
  controls.appendChild(btnClear);
  controls.appendChild(input);
  controls.appendChild(btnRun);

  const status = document.createElement('div');
  status.style.fontSize = '12px';
  status.style.opacity = '0.85';

  const logBox = document.createElement('div');
  logBox.style.flex = '1';
  logBox.style.overflow = 'auto';
  logBox.style.border = '1px solid rgba(255,255,255,0.12)';
  logBox.style.borderRadius = '6px';
  logBox.style.padding = '6px';

  const pre = document.createElement('pre');
  pre.style.margin = '0';
  pre.style.whiteSpace = 'pre-wrap';
  pre.style.wordBreak = 'break-word';
  pre.style.fontSize = '12px';

  logBox.appendChild(pre);

  root.appendChild(controls);
  root.appendChild(status);
  root.appendChild(logBox);

  w.setContent(root);

  function renderSettings(): void {
    const s = args.settings.get();
    btnVerbose.textContent = `Verbose: ${s.verbose ? 'ON' : 'OFF'}`;
    status.textContent = `enabled=${s.enabled ? 'true' : 'false'} verbose=${s.verbose ? 'true' : 'false'}`;
  }

  function renderLines(): void {
    const lines = args.log.getLines();
    pre.textContent = lines.map((l) => l.text).join('\n');
    // Auto-scroll to bottom.
    (logBox as any).scrollTop = (logBox as any).scrollHeight ?? 0;
  }

  const unsubSettings = args.settings.subscribe(() => renderSettings());
  const unsubLog = args.log.subscribe(() => renderLines());

  btnVerbose.addEventListener('click', () => {
    const next = !args.settings.get().verbose;
    args.settings.patch({ verbose: next });
    args.log.append(`[debug] verbose => ${next}`);
  });

  btnClear.addEventListener('click', () => {
    args.log.clear();
  });

  function runInput(): void {
    const value = String((input as any).value ?? '').trim();
    if (!value) return;
    (input as any).value = '';
    args.runner.run(value);
  }

  btnRun.addEventListener('click', runInput);
  input.addEventListener('keydown', (ev: any) => {
    if (ev?.key === 'Enter') {
      ev.preventDefault?.();
      runInput();
    }
  });

  const pingHandle = setInterval(() => {
    if (!args.settings.get().enabled) return;
    args.log.append('[ping]');
  }, 10_000);

  // Initial paint
  renderSettings();
  renderLines();

  return {
    window: w,
    dispose() {
      clearInterval(pingHandle as any);
      unsubSettings();
      unsubLog();
      w.destroy();
    },
  };
}
