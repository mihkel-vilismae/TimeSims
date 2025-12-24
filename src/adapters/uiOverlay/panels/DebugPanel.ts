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

  const autocomplete = document.createElement('div');
  autocomplete.className = 'ts-debug-autocomplete';
  autocomplete.style.display = 'none';
  autocomplete.style.border = '1px solid rgba(255,255,255,0.12)';
  autocomplete.style.borderRadius = '6px';
  autocomplete.style.padding = '4px';
  autocomplete.style.fontSize = '12px';
  autocomplete.style.maxHeight = '120px';
  autocomplete.style.overflow = 'auto';

  const helpText = document.createElement('div');
  helpText.className = 'ts-debug-help';
  helpText.style.fontSize = '12px';
  helpText.style.opacity = '0.85';
  helpText.textContent = 'Tip: type "/" then Tab to autocomplete. /help for full list.';

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
  root.appendChild(autocomplete);
  root.appendChild(helpText);
  root.appendChild(status);
  root.appendChild(logBox);

  w.setContent(root);

  function renderSettings(): void {
    const s = args.settings.get();
    btnVerbose.textContent = `Verbose: ${s.verbose ? 'ON' : 'OFF'}`;
    status.textContent = `enabled=${s.enabled ? 'true' : 'false'} verbose=${s.verbose ? 'true' : 'false'}`;
  }

  let suggestionIndex = 0;
  let suggestions: { command: string; help: string }[] = [];

  function renderAutocomplete(): void {
    if (!suggestions.length) {
      autocomplete.style.display = 'none';
      autocomplete.replaceChildren();
      return;
    }
    autocomplete.style.display = 'block';
    autocomplete.replaceChildren();

    suggestions.forEach((s, idx) => {
      const row = document.createElement('div');
      row.className = 'ts-debug-suggestion';
      row.dataset['cmd'] = s.command;
      row.style.padding = '2px 6px';
      row.style.borderRadius = '4px';
      row.style.cursor = 'pointer';
      row.style.opacity = idx === suggestionIndex ? '1' : '0.75';
      row.textContent = `${s.command} — ${s.help}`;
      row.addEventListener('click', () => {
        (input as any).value = `${s.command} `;
        (input as any).focus?.();
        updateSuggestions();
      });
      autocomplete.appendChild(row);
    });
  }

  function updateHelpText(): void {
    const value = String((input as any).value ?? '').trim();
    if (!value.startsWith('/')) return;
    const token = value.slice(1).split(/\s+/, 1)[0] || '';
    if (!token) return;
    const help = args.runner.getHelp(token);
    if (help) helpText.textContent = `/${token} — ${help}`;
  }

  function updateSuggestions(): void {
    const value = String((input as any).value ?? '');
    suggestions = args.runner.suggest(value);
    suggestionIndex = Math.min(suggestionIndex, Math.max(0, suggestions.length - 1));
    renderAutocomplete();
    updateHelpText();
  }

  function renderLines(): void {
    const lines = args.log.getLines();
    pre.textContent = lines.map((l) => l.text).join('\n');
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
    if (ev?.key === 'Tab' && suggestions.length) {
      ev.preventDefault?.();
      const pick = suggestions[suggestionIndex] ?? suggestions[0];
      if (pick) {
        (input as any).value = `${pick.command} `;
        updateSuggestions();
      }
      return;
    }
    if (ev?.key === 'ArrowDown' && suggestions.length) {
      ev.preventDefault?.();
      suggestionIndex = Math.min(suggestionIndex + 1, suggestions.length - 1);
      renderAutocomplete();
      return;
    }
    if (ev?.key === 'ArrowUp' && suggestions.length) {
      ev.preventDefault?.();
      suggestionIndex = Math.max(suggestionIndex - 1, 0);
      renderAutocomplete();
      return;
    }
    if (ev?.key === 'Enter') {
      ev.preventDefault?.();
      runInput();
    }
  });

  input.addEventListener('input', () => {
    suggestionIndex = 0;
    updateSuggestions();
  });

  const pingHandle = setInterval(() => {
    if (!args.settings.get().enabled) return;
    args.log.append('[ping]');
  }, 10_000);

  renderSettings();
  renderLines();
  updateSuggestions();

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
