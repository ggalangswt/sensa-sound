export interface GeneratedRound {
  round: number;
  targetHz: number;
  optionsHz: number[];
  promptLabel: string;
}

export interface CanonicalScoreBreakdown {
  total: number;
  perRound: Array<{
    round: number;
    score: number;
    targetHz: number;
    guessedHz: number;
    deltaHz: number;
  }>;
}
