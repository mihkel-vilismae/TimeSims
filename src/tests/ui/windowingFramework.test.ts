import { beforeEach, describe, expect, it } from 'vitest';
import { AnchoredWindow, FloatingWindow, createOverlayRoot, ensureOverlayStyles } from '../../adapters/uiOverlay';

// Minimal DOM shim for node-environment tests.
// We only implement the subset of DOM used by the windowing framework.

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
  style: Record<string, string> = {};
  children: FakeHTMLElement[] = [];
  parent: FakeHTMLElement | null = null;
  private listeners: Record<string, Listener[]> = {};

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

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
    // Only support simple class selectors like '.ts-window__header'
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

  get isConnected(): boolean {
    let cur: FakeHTMLElement | null = this;
    while (cur) {
      if (cur === (globalThis as any).document?.body) return true;
      cur = cur.parent;
    }
    return false;
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
  constructor() { super('div'); }
}

class FakeHTMLButtonElement extends FakeHTMLElement {
  type = 'button';
  title = '';
  constructor() { super('button'); }
  click(): void { this.dispatchEvent({ type: 'click', preventDefault() {}, stopPropagation() {} }); }
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
      case 'style': return new FakeHTMLStyleElement();
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

function qs(root: any, selector: string): any {
  const el = root.querySelector(selector);
  if (!el) throw new Error(`Missing ${selector}`);
  return el;
}

beforeEach(() => {
  const doc = new FakeDocument();
  (globalThis as any).document = doc;
  (globalThis as any).HTMLElement = FakeHTMLElement;
  (globalThis as any).HTMLDivElement = FakeHTMLDivElement;
  (globalThis as any).HTMLButtonElement = FakeHTMLButtonElement;
});

describe('uiOverlay windowing framework (node DOM shim)', () => {
  it('floating window mounts, sets title, and toggles minimize', () => {
    const w = new FloatingWindow({
      id: 'dbg',
      title: 'Debug',
      rect: { x: 10, y: 20, w: 300, h: 200 }
    });

    const root = createOverlayRoot('test-overlay-root');
    w.mount(root);

    const el = w.element;
    const header = qs(el, '.ts-window__header');
    const title = qs(header, '.ts-window__title');
    expect(title.textContent).toBe('Debug');

    w.setTitle('Debug2');
    expect(title.textContent).toBe('Debug2');

    const content = qs(el, '.ts-window__content');
    expect(w.isMinimized()).toBe(false);

    const btn = qs(header, '.ts-window__minimize') as FakeHTMLButtonElement;
    btn.click();
    expect(w.isMinimized()).toBe(true);
    expect(content.style.display).toBe('none');

    btn.click();
    expect(w.isMinimized()).toBe(false);
    expect(content.style.display).toBe('');
  });

  it('floating window applies fixed layout from rect and updates styles on setRect', () => {
    const w = new FloatingWindow({
      id: 'float',
      title: 'Float',
      rect: { x: 5, y: 6, w: 123, h: 45 }
    });

    const root = createOverlayRoot('test-overlay-root-2');
    w.mount(root);

    const el = w.element;
    expect(el.style.position).toBe('fixed');
    expect(el.style.left).toBe('5px');
    expect(el.style.top).toBe('6px');
    expect(el.style.width).toBe('123px');
    expect(el.style.height).toBe('45px');

    w.setRect({ x: 40, y: 50 });
    expect(el.style.left).toBe('40px');
    expect(el.style.top).toBe('50px');
  });

  it('anchored window applies UPPER_MIDDLE preset', () => {
    const w = new AnchoredWindow({
      id: 'um',
      title: 'Upper',
      anchor: 'UPPER_MIDDLE'
    });

    const root = createOverlayRoot('test-overlay-root-3');
    w.mount(root);

    const el = w.element;
    expect(el.style.position).toBe('fixed');
    expect(el.style.top).toBe('8px');
    expect(el.style.left).toBe('50%');
    expect(el.style.transform).toBe('translateX(-50%)');
  });

  it('ensureOverlayStyles is idempotent', () => {
    ensureOverlayStyles();
    const first = (globalThis as any).document.getElementById('timesims-ui-overlay-styles');
    expect(first).not.toBeNull();
    ensureOverlayStyles();
    const second = (globalThis as any).document.getElementById('timesims-ui-overlay-styles');
    expect(second).toBe(first);
  });
});
