export type InputCallbacks = {
  onLeftClick: (ev: MouseEvent) => void;
  onRightClick: (ev: MouseEvent) => void;
  onMouseMove: (ev: MouseEvent) => void;
  onKeyDown: (ev: KeyboardEvent) => void;
  onWindowPointerDown: (ev: PointerEvent) => void;
};

export function installInputHandlers(params: {
  rendererDom: HTMLElement;
  callbacks: InputCallbacks;
}): () => void {
  const { rendererDom, callbacks } = params;

  const onPointerDown = (ev: PointerEvent) => callbacks.onWindowPointerDown(ev);
  const onKeyDown = (ev: KeyboardEvent) => callbacks.onKeyDown(ev);

  const onClick = (ev: MouseEvent) => callbacks.onLeftClick(ev);
  const onContext = (ev: MouseEvent) => callbacks.onRightClick(ev);
  const onMove = (ev: MouseEvent) => callbacks.onMouseMove(ev);

  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);
  rendererDom.addEventListener('click', onClick);
  rendererDom.addEventListener('contextmenu', onContext);
  rendererDom.addEventListener('mousemove', onMove);

  return () => {
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('keydown', onKeyDown);
    rendererDom.removeEventListener('click', onClick);
    rendererDom.removeEventListener('contextmenu', onContext);
    rendererDom.removeEventListener('mousemove', onMove);
  };
}
