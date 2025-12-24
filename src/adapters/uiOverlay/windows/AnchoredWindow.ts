import type { AnchorOffsetsPx, AnchorPreset, WindowOptions } from './types';
import { Window } from './Window';

export type AnchoredWindowOptions = WindowOptions & {
  anchor: AnchorPreset;
  offsets?: AnchorOffsetsPx;
};

/**
 * A fixed-position window anchored to the viewport using presets.
 * Not draggable by default.
 */
export class AnchoredWindow extends Window {
  private anchor: AnchorPreset;
  private offsets: AnchorOffsetsPx;

  constructor(opts: AnchoredWindowOptions) {
    super(opts);
    this.anchor = opts.anchor;
    this.offsets = opts.offsets ?? {};
    this.root.classList.add('ts-window--anchored');
  }

  setAnchor(anchor: AnchorPreset, offsets?: AnchorOffsetsPx): void {
    this.anchor = anchor;
    if (offsets) this.offsets = offsets;
    this.applyLayout();
  }

  protected applyLayout(): void {
    this.root.style.position = 'fixed';
    // Reset
    this.root.style.top = '';
    this.root.style.left = '';
    this.root.style.right = '';
    this.root.style.bottom = '';
    this.root.style.transform = '';

    const o = this.offsets;

    switch (this.anchor) {
      case 'UPPER_MIDDLE': {
        const top = o.top ?? 8;
        this.root.style.top = `${top}px`;
        this.root.style.left = '50%';
        this.root.style.transform = 'translateX(-50%)';
        break;
      }
      case 'LOWER_LEFT': {
        const left = o.left ?? 12;
        const bottom = o.bottom ?? 12;
        this.root.style.left = `${left}px`;
        this.root.style.bottom = `${bottom}px`;
        break;
      }
      case 'TOP_RIGHT': {
        const top = o.top ?? 12;
        const right = o.right ?? 12;
        this.root.style.top = `${top}px`;
        this.root.style.right = `${right}px`;
        break;
      }
      case 'RIGHT_MIDDLE': {
        const right = o.right ?? 12;
        this.root.style.top = '50%';
        this.root.style.right = `${right}px`;
        this.root.style.transform = 'translateY(-50%)';
        break;
      }
    }
  }
}
