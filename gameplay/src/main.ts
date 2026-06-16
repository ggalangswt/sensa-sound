import "./style.css";

import {
  buildSoundGameplayConfig,
  scoreSoundMatch,
  type SoundGameplayConfig,
  type SoundMatchSubmission,
  type SoundOctaveShift,
} from "@sound/index";
import { freqFromNorm } from "@sound/engine/tone";

type HostInitMessage = {
  type: "sensa-sound:init";
  payload: {
    matchId: string;
    roomId: string;
    walletAddress: string;
    difficulty: "easy" | "hard";
    octaveShift?: SoundOctaveShift;
    submittedAt?: string;
  };
};

type RoundEntry = {
  round: number;
  pickedNorm: number;
  latencyMs: number;
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app");
}

const rootOrigin = "*";

let config: SoundGameplayConfig | null = null;
let roomId = "";
let walletAddress = "";
let muted = false;
let roundIndex = 0;
let pickingNorm = 0.5;
let roundEntries: RoundEntry[] = [];
let audioGateOpen = true;
let audioContext: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let currentWaveFrame = 0;
let roundStartedAt = 0;

function post(type: string, payload?: unknown) {
  window.parent?.postMessage({ type, payload }, rootOrigin);
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error("Web Audio API is not supported");
    }
    audioContext = new AudioContextCtor();
  }

  if (!gainNode) {
    gainNode = audioContext.createGain();
    gainNode.gain.value = muted ? 0 : 0.12;
    gainNode.connect(audioContext.destination);
  }

  return audioContext;
}

async function unlockAudio() {
  const context = ensureAudioContext();
  if (context.state !== "running") {
    await context.resume();
  }
  audioGateOpen = false;
}

function setMuted(nextMuted: boolean) {
  muted = nextMuted;
  if (gainNode) {
    gainNode.gain.value = muted ? 0 : 0.12;
  }
  render();
}

function stopTone(release = false) {
  if (!oscillator || !audioContext || !gainNode) return;

  try {
    const now = audioContext.currentTime;
    if (release) {
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      oscillator.stop(now + 0.11);
    } else {
      oscillator.stop();
    }
  } catch {}

  oscillator = null;
}

function playTone(freq: number) {
  const context = ensureAudioContext();
  if (!gainNode) return;

  stopTone();

  oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = freq;
  oscillator.connect(gainNode);
  oscillator.start();
}

function updateTone(freq: number) {
  if (!oscillator || !audioContext) return;
  oscillator.frequency.setTargetAtTime(freq, audioContext.currentTime, 0.03);
}

function currentRound() {
  if (!config) throw new Error("Gameplay config not initialized");
  return config.rounds[roundIndex];
}

function feedbackForScore(score: number): string {
  if (score >= 9.5) return "Almost perfect.";
  if (score >= 8) return "Strong ear.";
  if (score >= 6) return "Good call.";
  if (score >= 4) return "Getting closer.";
  if (score >= 2) return "A bit off.";
  return "Needs another pass.";
}

function totalCopy(total: number): string {
  if (total >= 45) return "Elite listening control.";
  if (total >= 36) return "A sharp overall run.";
  if (total >= 27) return "Solid room-read potential.";
  if (total >= 18) return "Promising, but still loose.";
  return "Needs more repetition.";
}

function animateWave() {
  const back = document.querySelector<HTMLElement>(".wave-line.back");
  const front = document.querySelector<HTMLElement>(".wave-line.front");
  if (!back || !front) return;

  currentWaveFrame += 1;
  const base = Math.sin(currentWaveFrame / 18) * 18;
  const accent = Math.cos(currentWaveFrame / 12) * 12;
  back.style.transform = `translateY(${base}px) scaleX(${1 + Math.abs(base) / 80})`;
  front.style.transform = `translateY(${accent}px) scaleX(${1.02 + Math.abs(accent) / 90})`;

  requestAnimationFrame(animateWave);
}

function startCountdown() {
  const words = ["READY", "SET", "GO"];
  let index = 0;

  const next = () => {
    render({ countdownWord: words[index] });
    if (index === words.length - 1) {
      setTimeout(runListenPhase, 550);
      return;
    }
    index += 1;
    setTimeout(next, 650);
  };

  next();
}

function runListenPhase() {
  if (!config) return;
  const round = currentRound();
  render({ phase: "listen", timerMs: config.memorizeMs });

  setTimeout(() => {
    playTone(round.targetHz);
    const started = performance.now();
    const tick = () => {
      if (!config) return;
      const remainingMs = Math.max(0, config.memorizeMs - (performance.now() - started));
      render({ phase: "listen", timerMs: remainingMs });
      if (remainingMs > 0) {
        requestAnimationFrame(tick);
      } else {
        stopTone(true);
        setTimeout(runTunePhase, 320);
      }
    };
    requestAnimationFrame(tick);
  }, 450);
}

function runTunePhase() {
  if (!config) return;
  const round = currentRound();
  let startNorm = 0.14 + ((round.round * 0.17) % 0.72);
  if (Math.abs(startNorm - round.targetNorm) < 0.18) {
    startNorm = round.targetNorm > 0.5 ? 0.16 : 0.84;
  }
  pickingNorm = Math.max(0.05, Math.min(0.95, startNorm));
  roundStartedAt = Date.now();
  playTone(freqFromNorm(pickingNorm, config.difficulty));
  render({ phase: "tune", timerMs: config.guessSeconds * 1000 });

  const started = performance.now();
  const tick = () => {
    if (!config) return;
    const remainingMs = Math.max(0, config.guessSeconds * 1000 - (performance.now() - started));
    render({ phase: "tune", timerMs: remainingMs });
    if (remainingMs > 0) {
      requestAnimationFrame(tick);
    } else {
      finishRound();
    }
  };
  requestAnimationFrame(tick);
}

function finishRound() {
  if (!config) return;
  stopTone(true);
  roundEntries.push({
    round: currentRound().round,
    pickedNorm: pickingNorm,
    latencyMs: Math.max(0, Date.now() - roundStartedAt),
  });

  const partial = scoreSoundMatch(config, {
    roomId,
    walletAddress,
    submittedAt: new Date().toISOString(),
    difficulty: config.difficulty,
    octaveShift: config.octaveShift,
    totalScore: 0,
    rounds: roundEntries,
  });
  const roundResult = partial.perRound[partial.perRound.length - 1];

  render({ phase: "result", roundResult });
}

function advanceFromResult() {
  if (!config) return;
  if (roundIndex >= config.rounds.length - 1) {
    showTotal();
    return;
  }
  roundIndex += 1;
  startCountdown();
}

function showTotal() {
  if (!config) return;
  const submission = buildSubmission();
  const computed = scoreSoundMatch(config, submission);
  render({ phase: "total", computed });
}

function buildSubmission(): SoundMatchSubmission {
  if (!config) {
    throw new Error("Gameplay config not initialized");
  }
  const computed = scoreSoundMatch(config, {
    roomId,
    walletAddress,
    submittedAt: new Date().toISOString(),
    difficulty: config.difficulty,
    octaveShift: config.octaveShift,
    totalScore: 0,
    rounds: roundEntries,
  });

  return {
    roomId,
    walletAddress,
    submittedAt: new Date().toISOString(),
    difficulty: config.difficulty,
    octaveShift: config.octaveShift,
    totalScore: computed.total,
    rounds: roundEntries,
  };
}

function completeMatch() {
  if (!config) return;
  post("sensa-sound:match-complete", {
    config,
    submission: buildSubmission(),
  });
}

function updateNormFromPointer(clientY: number) {
  const track = document.querySelector<HTMLElement>(".vertical-track");
  if (!track || !config) return;
  const rect = track.getBoundingClientRect();
  const next = 1 - (clientY - rect.top) / rect.height;
  pickingNorm = Math.max(0, Math.min(1, next));
  updateTone(freqFromNorm(pickingNorm, config.difficulty));
  render({ phase: "tune" });
}

type RenderState = {
  phase?: "boot" | "listen" | "tune" | "result" | "total";
  countdownWord?: string;
  timerMs?: number;
  roundResult?: ReturnType<typeof scoreSoundMatch>["perRound"][number];
  computed?: ReturnType<typeof scoreSoundMatch>;
};

let lastState: RenderState = { phase: "boot" };

function render(statePatch: RenderState = {}) {
  lastState = { ...lastState, ...statePatch };

  const phase = lastState.phase ?? "boot";
  const timerMs = lastState.timerMs ?? 0;
  const round = config?.rounds[roundIndex];
  const readoutHz = config ? freqFromNorm(pickingNorm, config.difficulty).toFixed(2) : "0.00";
  const timerSeconds = Math.max(0, timerMs / 1000);
  const timerInt = Math.floor(timerSeconds).toString();
  const timerDec = Math.floor((timerSeconds % 1) * 100)
    .toString()
    .padStart(2, "0");
  const thumbTop = `${(1 - pickingNorm) * 100}%`;
  const title = config ? `${round?.round ?? 0}/${config.rounds.length} · ${config.difficulty.toUpperCase()}${config.octaveShift === 1 ? " · +8va" : config.octaveShift === -1 ? " · -8va" : ""}` : "Waiting for match";

  app.innerHTML = `
    <div class="sound-shell">
      <div class="screen">
        <div class="hud">
          <div class="pill">${title}</div>
          <button class="mute-btn" type="button" aria-label="Toggle mute">${muted ? "🔇" : "🔊"}</button>
        </div>
        <div class="center-stage ${lastState.countdownWord ? "" : "hidden"}">
          <div class="countdown-word">${lastState.countdownWord ?? ""}</div>
        </div>
        <div class="listen-panel ${phase === "listen" || phase === "tune" ? "" : "hidden"}">
          <div class="wave-card">
            <div class="pill" style="position:absolute;top:20px;left:20px;">
              <span class="timer-int">${timerInt}</span>
              <span class="timer-dec">${timerDec}</span>
            </div>
            <div class="wave-meter">
              <div class="wave-line back"></div>
              <div class="wave-line front"></div>
            </div>
            <div class="vertical-track ${phase === "tune" ? "" : "hidden"}">
              <div class="thumb" style="top:${thumbTop};"></div>
            </div>
            <div class="big-label">
              <div>
                <div class="subtle">${phase === "listen" ? "Listen and hold the pitch." : "Drag to match the tone."}</div>
                <div class="hz-readout">${phase === "tune" ? `${readoutHz} Hz` : "Memorize"}</div>
              </div>
              <button class="go-btn ${phase === "tune" ? "" : "hidden"}" type="button" aria-label="Submit round">→</button>
            </div>
          </div>
        </div>
        <div class="result-panel ${phase === "result" ? "" : "hidden"}">
          <div class="result-card">
            <div class="center-stage" style="padding:24px;">
              <div class="score-value">${lastState.roundResult?.score.toFixed(2) ?? "0.00"}<span class="score-unit">/10</span></div>
              <div class="result-copy">${feedbackForScore(lastState.roundResult?.score ?? 0)}</div>
              <div class="meta-grid" style="width:100%;margin-top:22px;">
                <div class="meta-row"><span class="subtle">Target</span><strong>${lastState.roundResult?.targetHz.toFixed(2) ?? "0.00"} Hz</strong></div>
                <div class="meta-row"><span class="subtle">Your pick</span><strong>${lastState.roundResult?.guessedHz.toFixed(2) ?? "0.00"} Hz</strong></div>
                <div class="meta-row"><span class="subtle">Round time</span><strong>${(((lastState.roundResult?.latencyMs ?? 0) / 1000)).toFixed(2)}s</strong></div>
              </div>
              <button class="secondary-btn" type="button" data-action="next-round">Next round</button>
            </div>
          </div>
        </div>
        <div class="total-panel ${phase === "total" ? "" : "hidden"}">
          <div class="total-card">
            <div style="padding:24px;">
              <div class="score-value">${lastState.computed?.total.toFixed(2) ?? "0.00"}<span class="score-unit">/50</span></div>
              <div class="result-copy">${totalCopy(lastState.computed?.total ?? 0)}</div>
              <div class="total-list">
                ${(lastState.computed?.perRound ?? [])
                  .map(
                    (entry) => `
                    <div class="total-item">
                      <div class="subtle">R${entry.round}</div>
                      <div>${entry.guessedHz.toFixed(2)} Hz</div>
                      <strong>${entry.score.toFixed(2)}</strong>
                    </div>`,
                  )
                  .join("")}
              </div>
              <button class="secondary-btn" type="button" data-action="finish-match">Continue to result</button>
            </div>
          </div>
        </div>
      </div>
      <div class="audio-gate ${audioGateOpen ? "" : "hidden"}">
        <div class="gate-sheet">
          <div class="pill">Audio required</div>
          <h2>Turn on sound to play this match.</h2>
          <p class="subtle">Sensa Sound needs audio before the first round starts.</p>
          <button class="gate-cta" type="button">Turn on sound</button>
        </div>
      </div>
    </div>
  `;

  const muteButton = document.querySelector<HTMLButtonElement>(".mute-btn");
  muteButton?.addEventListener("click", () => setMuted(!muted));

  const gateButton = document.querySelector<HTMLButtonElement>(".gate-cta");
  gateButton?.addEventListener("click", async () => {
    try {
      await unlockAudio();
      render();
      if (config) startCountdown();
    } catch (error) {
      post("sensa-sound:error", {
        message: error instanceof Error ? error.message : "Audio unlock failed",
      });
    }
  });

  const goButton = document.querySelector<HTMLButtonElement>(".go-btn");
  goButton?.addEventListener("click", finishRound);

  const nextButton = document.querySelector<HTMLButtonElement>("[data-action='next-round']");
  nextButton?.addEventListener("click", advanceFromResult);

  const finishButton = document.querySelector<HTMLButtonElement>("[data-action='finish-match']");
  finishButton?.addEventListener("click", completeMatch);

  const track = document.querySelector<HTMLElement>(".vertical-track");
  if (track) {
    let dragging = false;
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      updateNormFromPointer(event.clientY);
    };
    const onPointerUp = () => {
      dragging = false;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    track.addEventListener("pointerdown", (event) => {
      dragging = true;
      updateNormFromPointer(event.clientY);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    });
  }
}

window.addEventListener("message", (event: MessageEvent<HostInitMessage>) => {
  if (event.data?.type !== "sensa-sound:init") return;

  const payload = event.data.payload;
  roomId = payload.roomId;
  walletAddress = payload.walletAddress;
  config = buildSoundGameplayConfig({
    matchId: payload.matchId,
    difficulty: payload.difficulty,
    octaveShift: payload.octaveShift ?? 0,
  });
  roundEntries = [];
  roundIndex = 0;
  pickingNorm = 0.5;
  lastState = { phase: "boot", countdownWord: undefined, timerMs: 0 };
  render();
});

render();
animateWave();
post("sensa-sound:ready");
