export interface GameState {
  round: number;
  totalScore: number;
  roundScores: number[];
  targets: number[];
  picks: number[];
  latencies: number[];
}

export type SoundDifficulty = 'easy' | 'hard';
export type SoundOctaveShift = -1 | 0 | 1;

export interface SoundGameplayRound {
  round: number;
  promptLabel: string;
  targetNorm: number;
  targetHz: number;
}

export interface SoundGameplayConfig {
  matchId: string;
  difficulty: SoundDifficulty;
  octaveShift: SoundOctaveShift;
  rounds: SoundGameplayRound[];
  memorizeMs: number;
  guessSeconds: number;
}

export interface SoundRoundSubmission {
  round: number;
  pickedNorm: number;
  latencyMs: number;
}

export interface SoundMatchSubmission {
  roomId: string;
  walletAddress: string;
  submittedAt: string;
  difficulty: SoundDifficulty;
  octaveShift: SoundOctaveShift;
  totalScore: number;
  rounds: SoundRoundSubmission[];
}

export interface SoundInitPayload {
  matchId: string;
  roomId: string;
  walletAddress: string;
  mode: 'solo' | 'duel' | 'royale';
  isPractice: boolean;
  gameplayConfig: SoundGameplayConfig;
}

export interface SoundSubmissionResult {
  accepted: boolean;
  resolved?: boolean;
  refunded?: boolean;
  waiting?: boolean;
  outcome?: 'prize' | 'refund' | 'no-prize' | 'waiting';
  message?: string;
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
