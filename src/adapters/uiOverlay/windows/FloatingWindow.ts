import type { FloatingRectPx, WindowOptions } from './types';
import { Window } from './Window';

export type FloatingWindowOptions = WindowOptions & {
  rect: FloatingRectPx;
  resizable?: boolean;
  draggable?: boolean;
};

/**
 * A draggable, (optionally) resizable, minimizable floating window.
 */
export class FloatingWindow extends Window {
  private rect: FloatingRectPx;
  private readonly resizable: boolean;
  private readonly draggable: boolean;

  private dragPointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartLeft = 0;
  private dragStartTop = 0;

  private static nextZ = 10000;

  constructor(opts: FloatingWindowOptions) {
    super(opts);
    this.rect = { ...opts.rect };
    this.resizable = opts.resizable ?? true;
    this.draggable = opts.draggable ?? true;

    this.root.classList.add('ts-window--floating');
    if (this.resizable) this.root.classList.add('ts-window--resizable');

    // Focus (bring to front)
    this.root.addEventListener('pointerdown', () => {
      this.bumpZ();
    });

    if (this.draggable) this.enableDragging();
  }

  setRect(rect: Partial<FloatingRectPx>): void {
    this.rect = { ...this.rect, ...rect };
    this.applyLayout();
  }

  getRect(): FloatingRectPx {
    return { ...this.rect };
  }

  protected applyLayout(): void {
    const { x, y, w, h } = this.rect;
    this.root.style.position = 'fixed';
    this.root.style.left = `${Math.round(x)}px`;
    this.root.style.top = `${Math.round(y)}px`;
    this.root.style.width = `${Math.round(w)}px`;
    this.root.style.height = `${Math.round(h)}px`;
  }

  private bumpZ(): void {
    FloatingWindow.nextZ += 1;
    this.root.style.zIndex = String(FloatingWindow.nextZ);
  }

  private enableDragging(): void {
    this.header.addEventListener('pointerdown', (e) => {
      // Only left click style interactions.
      if (e.button !== 0) return;

      this.dragPointerId = e.pointerId;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragStartLeft = this.rect.x;
      this.dragStartTop = this.rect.y;

      this.header.setPointerCapture(e.pointerId);
      this.header.classList.add('ts-window__header--dragging');

      e.preventDefault();
      e.stopPropagation();
    });

    this.header.addEventListener('pointermove', (e) => {
      if (this.dragPointerId !== e.pointerId) return;

      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;

      this.setRect({ x: this.dragStartLeft + dx, y: this.dragStartTop + dy });
    });

    const endDrag = (e: PointerEvent): void => {
      if (this.dragPointerId !== e.pointerId) return;
      this.dragPointerId = null;
      try {
        this.header.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if capture was lost.
      }
      this.header.classList.remove('ts-window__header--dragging');
    };

    this.header.addEventListener('pointerup', endDrag);
    this.header.addEventListener('pointercancel', endDrag);
  }
}
