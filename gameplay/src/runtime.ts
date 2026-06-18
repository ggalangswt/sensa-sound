import { setHardMode, setOctaveShift } from './config';
import type {
  SoundInitPayload,
  SoundMatchSubmission,
  SoundSubmissionResult,
} from './types';

let initPayload: SoundInitPayload | null = null;
let lastSubmission: SoundMatchSubmission | null = null;

export function getInitPayload() {
  return initPayload;
}

export function setInitPayload(payload: SoundInitPayload) {
  initPayload = payload;
  lastSubmission = null;
  setHardMode(payload.gameplayConfig.difficulty === 'hard');
  setOctaveShift(payload.gameplayConfig.octaveShift);
}

export function setLastSubmission(submission: SoundMatchSubmission) {
  lastSubmission = submission;
}

export function getLastSubmission() {
  return lastSubmission;
}

export function postToParent(type: string, payload?: unknown) {
  if (window.parent === window) return;
  window.parent.postMessage({ type, payload }, '*');
}

export function submitMatch(submission: SoundMatchSubmission) {
  setLastSubmission(submission);
  postToParent('sensa-sound:match-complete', { submission });
}

export function requestReplay() {
  postToParent('sensa-sound:replay-request');
}

export function requestExit() {
  postToParent('sensa-sound:exit');
}

export function listenForSubmissionResult(
  callback: (result: SoundSubmissionResult) => void,
) {
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window.parent) return;
    const data = event.data as
      | { type?: string; payload?: SoundSubmissionResult }
      | undefined;
    if (data?.type === 'sensa-sound:submission-result' && data.payload) {
      callback(data.payload);
    }
  });
}
