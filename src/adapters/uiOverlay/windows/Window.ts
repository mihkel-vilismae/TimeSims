import type { WindowOptions } from './types';

/**
 * Base UI window primitive.
 *
 * - DOM-only (adapters layer)
 * - No import-time side effects
 * - Subclasses decide layout (floating vs anchored)
 */
export abstract class Window {
  protected readonly opts: WindowOptions;

  protected readonly root: HTMLDivElement;
  protected readonly header: HTMLDivElement;
  protected readonly titleEl: HTMLDivElement;
  protected readonly actions: HTMLDivElement;
  protected readonly minimizeBtn: HTMLButtonElement;
  protected readonly content: HTMLDivElement;

  private mounted = false;
  private minimized = false;
  private minimizable = true;

  constructor(opts: WindowOptions) {
    this.opts = opts;

    this.root = document.createElement('div');
    this.root.className = ['ts-window', opts.className].filter(Boolean).join(' ');
    this.root.dataset['tsWindowId'] = opts.id;

    this.header = document.createElement('div');
    this.header.className = 'ts-window__header';

    this.titleEl = document.createElement('div');
    this.titleEl.className = 'ts-window__title';
    this.titleEl.textContent = opts.title;

    this.actions = document.createElement('div');
    this.actions.className = 'ts-window__actions';

    this.minimizeBtn = document.createElement('button');
    this.minimizeBtn.type = 'button';
    this.minimizeBtn.className = 'ts-window__minimize';
    this.minimizeBtn.title = 'Minimize';
    this.minimizeBtn.textContent = '_';

    this.minimizeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.minimizable) return;
      this.setMinimized(!this.minimized);
    });

    this.actions.appendChild(this.minimizeBtn);
    this.header.appendChild(this.titleEl);
    this.header.appendChild(this.actions);

    this.content = document.createElement('div');
    this.content.className = 'ts-window__content';

    this.root.appendChild(this.header);
    this.root.appendChild(this.content);

    this.setMinimizable(opts.minimizable ?? true);
    if (opts.startMinimized) this.setMinimized(true);
  }

  /** Mounts the window to a parent DOM node. Idempotent. */
  mount(parent: HTMLElement): void {
    if (this.mounted) return;
    parent.appendChild(this.root);
    this.applyLayout();
    this.mounted = true;
    this.onAfterMount();
  }

  /** Unmount and clean up DOM. Idempotent. */
  destroy(): void {
    if (!this.root.isConnected) return;
    this.root.remove();
    this.mounted = false;
  }

  setTitle(title: string): void {
    this.titleEl.textContent = title;
  }

  setContent(node: Node): void {
    this.content.replaceChildren(node);
  }

  setContentHtml(html: string): void {
    this.content.innerHTML = html;
  }

  setMinimizable(on: boolean): void {
    this.minimizable = on;
    this.minimizeBtn.style.display = on ? '' : 'none';
  }

  isMinimized(): boolean {
    return this.minimized;
  }

  setMinimized(on: boolean): void {
    this.minimized = on;

    if (on) {
      this.root.classList.add('ts-window--minimized');
      this.content.style.display = 'none';
      this.minimizeBtn.textContent = '+';
      this.minimizeBtn.title = 'Expand';
    } else {
      this.root.classList.remove('ts-window--minimized');
      this.content.style.display = '';
      this.minimizeBtn.textContent = '_';
      this.minimizeBtn.title = 'Minimize';
    }
  }

  /** Root DOM element (read-only). */
  get element(): HTMLDivElement {
    return this.root;
  }

  /** Header element (useful for drag handles, etc.). */
  get headerElement(): HTMLDivElement {
    return this.header;
  }

  /** Content element (for direct DOM composition). */
  get contentElement(): HTMLDivElement {
    return this.content;
  }

  /** Subclass applies its layout strategy to the root element. */
  protected abstract applyLayout(): void;

  /** Optional hook invoked after mount. */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onAfterMount(): void {}
}
