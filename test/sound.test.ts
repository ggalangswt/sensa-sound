import { describe, expect, it } from "vitest";

import { buildDailySeed, buildSettlementPreview, generateSoundRounds, scoreSoundSubmission } from "../src/index";

describe("sound engine", () => {
  it("generates deterministic rounds for a stable seed", () => {
    const first = generateSoundRounds("abc123", "easy");
    const second = generateSoundRounds("abc123", "easy");

    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
  });

  it("scores within the 0-50 bounds", () => {
    const rounds = generateSoundRounds("score-seed", "hard");
    const result = scoreSoundSubmission("score-seed", "hard", {
      roomId: "room_1",
      walletAddress: "0x1",
      submittedAt: new Date().toISOString(),
      guesses: rounds.map((round) => ({
        round: round.round,
        guessedHz: round.frequencyHz,
        latencyMs: 800
      }))
    });

    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(50);
    expect(result.total).toBe(50);
  });

  it("keeps the daily seed stable per UTC day", () => {
    expect(buildDailySeed(new Date("2026-06-04T00:10:00Z"))).toBe(
      buildDailySeed(new Date("2026-06-04T23:59:59Z"))
    );
    expect(buildDailySeed(new Date("2026-06-04T23:59:59Z"))).not.toBe(
      buildDailySeed(new Date("2026-06-05T00:00:00Z"))
    );
  });

  it("splits payouts on ties", () => {
    const preview = buildSettlementPreview({
      roomId: "room_2",
      stakeUsd: 2,
      playerScores: [
        { walletAddress: "0x1", score: 41 },
        { walletAddress: "0x2", score: 41 },
        { walletAddress: "0x3", score: 35 }
      ]
    });

    expect(preview.winnerWalletAddresses).toEqual(["0x1", "0x2"]);
    expect(preview.splitPrizeUsd).toBeGreaterThan(0);
  });
});
