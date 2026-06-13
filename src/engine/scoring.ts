import type { SoundGuessSubmission } from "@sensa/shared";

import { SOUND_DEFAULTS } from "../constants/game";
import type { CanonicalScoreBreakdown } from "../types";
import { generateSoundRounds } from "./generator";

export function scoreSoundSubmission(
  seed: string,
  difficulty: "easy" | "hard",
  submission: SoundGuessSubmission
): CanonicalScoreBreakdown {
  const rounds = generateSoundRounds(seed, difficulty);

  const perRound = rounds.map((round) => {
    const guess = submission.guesses.find((entry) => entry.round === round.round);
    const guessedHz = guess?.guessedHz ?? 0;
    const deltaHz = Math.abs(round.frequencyHz - guessedHz);
    const score = Math.max(0, 10 - Math.floor(deltaHz / 25));

    return {
      round: round.round,
      score,
      targetHz: round.frequencyHz,
      guessedHz,
      deltaHz
    };
  });

  const total = perRound.reduce((sum, round) => sum + round.score, 0);

  return {
    total: Math.max(0, Math.min(total, SOUND_DEFAULTS.maxScore)),
    perRound
  };
}
