export type WindowOptions = {
  id: string;
  title: string;
  minimizable?: boolean;
  startMinimized?: boolean;
  className?: string;
};

export type FloatingRectPx = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type AnchorPreset =
  | 'UPPER_MIDDLE'
  | 'LOWER_LEFT'
  | 'TOP_RIGHT'
  | 'RIGHT_MIDDLE';

export type AnchorOffsetsPx = {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};
