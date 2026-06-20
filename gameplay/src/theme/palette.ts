export type WaveStop = {
  pos: number;
  r: number;
  g: number;
  b: number;
};

export const SENSA_WAVE: WaveStop[] = [
  { pos: 0, r: 253, g: 251, b: 81 },
  { pos: 0.28, r: 222, g: 211, b: 60 },
  { pos: 0.52, r: 142, g: 91, b: 168 },
  { pos: 0.76, r: 90, g: 43, b: 115 },
  { pos: 1, r: 66, g: 32, b: 87 },
];

export const SENSA_WAVE_ALT: WaveStop[] = [
  { pos: 0, r: 255, g: 254, b: 200 },
  { pos: 0.3, r: 253, g: 251, b: 81 },
  { pos: 0.58, r: 185, g: 139, b: 205 },
  { pos: 0.82, r: 123, g: 79, b: 150 },
  { pos: 1, r: 66, g: 32, b: 87 },
];
