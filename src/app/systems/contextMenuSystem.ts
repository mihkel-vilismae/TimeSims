import type { MenuCommand, MenuState } from '../../timesims/uiPlan/menuState';

export type ContextMenuDom = {
  root: HTMLDivElement;
  list: HTMLDivElement;
};

export function createContextMenuDom(): ContextMenuDom {
  const root = document.createElement('div');
  root.className = 'context-menu';
  root.style.position = 'fixed';
  root.style.left = '0px';
  root.style.top = '0px';
  root.style.display = 'none';
  root.style.zIndex = '50';

  const list = document.createElement('div');
  list.className = 'context-menu-list';
  root.appendChild(list);

  document.body.appendChild(root);
  return { root, list };
}

export function renderContextMenu(params: {
  dom: ContextMenuDom;
  state: MenuState;
  onCommand: (cmd: MenuCommand) => void;
}): void {
  const { dom, state, onCommand } = params;

  if (!state.open) {
    dom.root.style.display = 'none';
    dom.list.innerHTML = '';
    return;
  }

  dom.root.style.display = 'block';
  dom.root.style.left = `${Math.round(state.x)}px`;
  dom.root.style.top = `${Math.round(state.y)}px`;

  dom.list.innerHTML = '';
  for (const cmd of state.commands) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'context-menu-item';
    btn.textContent = labelForCommand(cmd);
    btn.addEventListener('click', () => onCommand(cmd));
    dom.list.appendChild(btn);
  }
}

function labelForCommand(cmd: MenuCommand): string {
  switch (cmd) {
    case 'move':
      return 'Move';
    case 'deploySmoke':
      return 'Deploy Smoke';
    case 'fortify':
      return 'Fortify';
    case 'reloadSpecial':
      return 'Reload Special';
    case 'refill':
      return 'Refill';
    default: {
      const _exhaustive: never = cmd;
      return _exhaustive;
    }
  }
}
