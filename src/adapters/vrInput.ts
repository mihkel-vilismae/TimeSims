// VR input adapter seam.
//
// This project is PC-first today, but the adapter exists so runtime/system code
// never depends directly on WebXR APIs.

export type VrHand = 'left' | 'right';

export type VrButtonState = {
  pressed: boolean;
  touched?: boolean;
  value?: number;
};

export type VrInputSnapshot = {
  hands: Record<VrHand, { buttons: Record<string, VrButtonState> }>;
};
