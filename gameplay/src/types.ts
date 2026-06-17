export interface GameState {
  round: number;
  totalScore: number;
  roundScores: number[];
  targets: number[];
  picks: number[];
}

export interface ToneVoice {
  osc: OscillatorNode;
  gain: GainNode;
  mult?: number;
  detune?: number;
}

export interface GradientStop {
  pos: number;
  r: number;
  g: number;
  b: number;
}

export interface CanvasSetup {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
}

declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}
