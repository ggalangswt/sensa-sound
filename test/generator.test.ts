import { describe, expect, it } from "vitest";

import {
  generateSoundRounds,
  maxFreq,
  minFreq,
  targetNormRange,
} from "../src/index";

const DIFFICULTIES = ["easy", "hard"] as const;
const OCTAVE_SHIFTS = [-1, 0, 1] as const;

describe("sound round generator", () => {
  it("is deterministic for the same seed", () => {
    expect(generateSoundRounds("stable-seed", "easy")).toEqual(
      generateSoundRounds("stable-seed", "easy"),
    );
  });

  it("produces different targets for different seeds", () => {
    expect(generateSoundRounds("seed-a", "easy")).not.toEqual(
      generateSoundRounds("seed-b", "easy"),
    );
  });

  it.each(DIFFICULTIES)(
    "places exactly one %s target in each logarithmic zone",
    (difficulty) => {
      const rounds = generateSoundRounds("zone-coverage", difficulty);
      const [lo, hi] = targetNormRange(difficulty, 0);
      const zoneWidth = (hi - lo) / rounds.length;
      const occupiedZones = rounds
        .map((round) =>
          Math.min(
            rounds.length - 1,
            Math.floor((round.targetNorm - lo) / zoneWidth),
          ),
        )
        .sort((a, b) => a - b);

      expect(occupiedZones).toEqual([0, 1, 2, 3, 4]);
    },
  );

  it("prevents all five targets from clustering in a narrow band", () => {
    for (let seed = 0; seed < 1_000; seed += 1) {
      const frequencies = generateSoundRounds(`spread-${seed}`, "easy").map(
        (round) => round.targetHz,
      );
      expect(Math.max(...frequencies) - Math.min(...frequencies)).toBeGreaterThan(
        100,
      );
    }
  });

  it.each(DIFFICULTIES)(
    "keeps %s targets reachable across octave modes",
    (difficulty) => {
      for (const octaveShift of OCTAVE_SHIFTS) {
        const rounds = generateSoundRounds(
          `octave-${difficulty}-${octaveShift}`,
          difficulty,
          octaveShift,
        );

        for (const round of rounds) {
          expect(round.targetHz).toBeGreaterThanOrEqual(minFreq(difficulty));
          expect(round.targetHz).toBeLessThanOrEqual(maxFreq(difficulty));
        }
      }
    },
  );
});
