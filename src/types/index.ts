export interface GeneratedRound {
  round: number;
  targetHz: number;
  optionsHz: number[];
  promptLabel: string;
}

export type SoundDifficulty = "easy" | "hard";

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

export interface SoundRoundResult {
  round: number;
  targetNorm: number;
  pickedNorm: number;
  targetHz: number;
  guessedHz: number;
  score: number;
  latencyMs: number;
}

export interface CanonicalScoreBreakdown {
  total: number;
  percent: number;
  perRound: SoundRoundResult[];
}
