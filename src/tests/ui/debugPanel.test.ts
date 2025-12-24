import { beforeEach, describe, expect, it } from 'vitest';

import { createOverlayRoot, ensureOverlayStyles, createDebugLog } from '../../adapters/uiOverlay';
import { createDebugSettingsStore } from '../../app/state/debugSettings';
import { createDebugCommandRunner } from '../../app/systems/debugCommands/runDebugCommand';
import { createDebugPanel } from '../../adapters/uiOverlay/panels/DebugPanel';

type Listener = (ev: any) => void;

class ClassList {
  private set = new Set<string>();
  add(c: string): void { this.set.add(c); }
  remove(c: string): void { this.set.delete(c); }
  contains(c: string): boolean { return this.set.has(c); }
  toString(): string { return [...this.set].join(' '); }
}

class FakeHTMLElement {
  tagName: string;
  id = '';
  textContent: string | null = '';
  innerHTML = '';
  classList = new ClassList();
  dataset: Record<string, string> = {};
  style: Record<string, any> = {};
  children: FakeHTMLElement[] = [];
  parent: FakeHTMLElement | null = null;
  private listeners: Record<string, Listener[]> = {};

  constructor(tagName: string) { this.tagName = tagName.toUpperCase(); }

  appendChild(child: any): any {
    if (child && child instanceof FakeHTMLElement) {
      child.parent = this;
      this.children.push(child);
    }
    return child;
  }

  replaceChildren(...nodes: any[]): void {
    this.children = [];
    for (const n of nodes) this.appendChild(n);
  }

  remove(): void {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((c) => c !== this);
    this.parent = null;
  }

  addEventListener(type: string, fn: Listener): void {
    (this.listeners[type] ||= []).push(fn);
  }

  dispatchEvent(ev: any): void {
    const list = this.listeners[ev?.type] || [];
    for (const fn of list) fn(ev);
  }

  querySelector(selector: string): any {
    if (!selector.startsWith('.')) return null;
    const className = selector.slice(1);
    const stack = [...this.children];
    while (stack.length) {
      const n = stack.shift()!;
      if (n.classList.contains(className)) return n;
      stack.push(...n.children);
    }
    return null;
  }

  set className(v: string) {
    this.classList = new ClassList();
    v.split(/\s+/).filter(Boolean).forEach((c) => this.classList.add(c));
  }

  get className(): string {
    return this.classList.toString();
  }

  setPointerCapture(): void {}
  releasePointerCapture(): void {}
}

class FakeHTMLDivElement extends FakeHTMLElement {
  scrollTop = 0;
  scrollHeight = 0;
  constructor() { super('div'); }
}

class FakeHTMLButtonElement extends FakeHTMLElement {
  type = 'button';
  constructor() { super('button'); }
  click(): void {
    this.dispatchEvent({ type: 'click', preventDefault() {}, stopPropagation() {} });
  }
}

class FakeHTMLInputElement extends FakeHTMLElement {
  type = 'text';
  value = '';
  placeholder = '';
  constructor() { super('input'); }
}

class FakeHTMLStyleElement extends FakeHTMLElement {
  constructor() { super('style'); }
}

class FakeDocument {
  head = new FakeHTMLDivElement();
  body = new FakeHTMLDivElement();

  createElement(tag: string): any {
    switch (tag.toLowerCase()) {
      case 'div': return new FakeHTMLDivElement();
      case 'button': return new FakeHTMLButtonElement();
      case 'input': return new FakeHTMLInputElement();
      case 'style': return new FakeHTMLStyleElement();
      case 'pre': return new FakeHTMLElement('pre');
      default: return new FakeHTMLElement(tag);
    }
  }

  getElementById(id: string): any {
    const search = (node: FakeHTMLElement): FakeHTMLElement | null => {
      if ((node as any).id === id) return node;
      for (const c of node.children) {
        const hit = search(c);
        if (hit) return hit;
      }
      return null;
    };
    return search(this.body) || search(this.head);
  }
}

function findButtonByPrefix(root: FakeHTMLElement, prefix: string): FakeHTMLButtonElement | null {
  const stack: FakeHTMLElement[] = [root];
  while (stack.length) {
    const n = stack.pop()!;
    if (n instanceof FakeHTMLButtonElement) {
      const t = String(n.textContent ?? '');
      if (t.startsWith(prefix)) return n;
    }
    stack.push(...n.children);
  }
  return null;
}

function findFirstInput(root: FakeHTMLElement): FakeHTMLInputElement | null {
  const stack: FakeHTMLElement[] = [root];
  while (stack.length) {
    const n = stack.pop()!;
    if (n instanceof FakeHTMLInputElement) return n;
    stack.push(...n.children);
  }
  return null;
}

beforeEach(() => {
  const doc = new FakeDocument();
  (globalThis as any).document = doc;
  (globalThis as any).HTMLElement = FakeHTMLElement;
  (globalThis as any).HTMLDivElement = FakeHTMLDivElement;
  (globalThis as any).HTMLButtonElement = FakeHTMLButtonElement;
});

describe('DebugPanel', () => {
  it('toggles verbose via button and updates label', () => {
    ensureOverlayStyles();
    const root = createOverlayRoot('test-overlay-root-debug');

    const log = createDebugLog(50);
    const settings = createDebugSettingsStore({ verbose: false });
    const runner = createDebugCommandRunner({ log, settings });

    const panel = createDebugPanel({ log, settings, runner });
    panel.window.mount(root);

    const btn1 = findButtonByPrefix(panel.window.element as any, 'Verbose:');
    expect(btn1).not.toBeNull();
    expect(String(btn1!.textContent)).toContain('OFF');

    btn1!.click();

    const btn2 = findButtonByPrefix(panel.window.element as any, 'Verbose:');
    expect(btn2).not.toBeNull();
    expect(settings.get().verbose).toBe(true);
    expect(String(btn2!.textContent)).toContain('ON');

    panel.dispose();
  });

  it('offers command autocomplete suggestions and supports Tab completion', () => {
    ensureOverlayStyles();
    const root = createOverlayRoot('test-overlay-root-autocomplete');

    const log = createDebugLog(50);
    const settings = createDebugSettingsStore({ verbose: false });
    const runner = createDebugCommandRunner({ log, settings });

    const panel = createDebugPanel({ log, settings, runner });
    panel.window.mount(root);

    const input = findFirstInput(panel.window.element as any);
    expect(input).not.toBeNull();

    input!.value = '/ver';
    input!.dispatchEvent({ type: 'input' });

    const ac = (panel.window.element as any).querySelector('.ts-debug-autocomplete') as FakeHTMLElement;
    expect(ac).not.toBeNull();
    expect(String((ac as any).style.display)).toBe('block');

    const joined = ac.children.map((c) => String(c.textContent ?? '')).join('\n');
    expect(joined).toContain('/verbose');

    input!.dispatchEvent({ type: 'keydown', key: 'Tab', preventDefault() {} });
    expect(input!.value).toContain('/verbose');

    input!.value = '/verbose';
    input!.dispatchEvent({ type: 'input' });
    const help = (panel.window.element as any).querySelector('.ts-debug-help') as FakeHTMLElement;
    expect(help).not.toBeNull();
    expect(String(help.textContent ?? '')).toContain('Verbose');

    panel.dispose();
  });
});
