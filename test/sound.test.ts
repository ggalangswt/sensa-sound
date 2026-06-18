import { describe, expect, it } from "vitest";

import {
  buildDailySeed,
  buildSettlementPreview,
  buildSoundGameplayConfig,
  freqFromNorm,
  generateSoundRounds,
  scoreSoundSubmission,
} from "../src/index";

describe("sound engine", () => {
  it("generates deterministic rounds for a stable seed", () => {
    const first = generateSoundRounds("abc123", "easy");
    const second = generateSoundRounds("abc123", "easy");

    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
  });

  it("scores within the 0-50 bounds", () => {
    const config = buildSoundGameplayConfig({
      matchId: "score-seed",
      difficulty: "hard",
    });
    const result = scoreSoundSubmission("score-seed", "hard", {
      roomId: "room_1",
      walletAddress: "0x1",
      submittedAt: new Date().toISOString(),
      difficulty: "hard",
      octaveShift: 0,
      totalScore: 0,
      rounds: config.rounds.map((round) => ({
        round: round.round,
        pickedNorm: round.targetNorm,
        latencyMs: 800,
      })),
    });

    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(50);
    expect(result.total).toBe(50);
  });

  it("uses the Dialed frequency ranges as the canonical scale", () => {
    expect(freqFromNorm(0, "easy")).toBe(80);
    expect(freqFromNorm(1, "easy")).toBe(1200);
    expect(freqFromNorm(0, "hard")).toBe(60);
    expect(freqFromNorm(1, "hard")).toBe(1400);
  });

  it("ignores the client total and recomputes every round", () => {
    const config = buildSoundGameplayConfig({
      matchId: "client-total-is-untrusted",
      difficulty: "easy",
    });
    const result = scoreSoundSubmission("client-total-is-untrusted", "easy", {
      roomId: "room_3",
      walletAddress: "0x1",
      submittedAt: new Date().toISOString(),
      difficulty: "easy",
      octaveShift: 0,
      totalScore: 50,
      rounds: config.rounds.map((round) => ({
        round: round.round,
        pickedNorm: round.targetNorm === 0 ? 1 : 0,
        latencyMs: 15_000,
      })),
    });

    expect(result.total).toBeLessThan(50);
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
