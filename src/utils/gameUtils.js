import { MAX_COLS, MAX_ROWS, STATUS_PRIORITY } from "../constants/game";

export function createEmptyGrid(fillValue = "") {
  return Array.from({ length: MAX_ROWS }, () => Array(MAX_COLS).fill(fillValue));
}

export function evaluateGuess(guess, target) {
  const result = Array(MAX_COLS).fill("absent");
  const letterCount = {};

  for (const ch of target) {
    letterCount[ch] = (letterCount[ch] || 0) + 1;
  }

  for (let i = 0; i < MAX_COLS; i += 1) {
    if (guess[i] === target[i]) {
      result[i] = "correct";
      letterCount[guess[i]] -= 1;
    }
  }

  for (let i = 0; i < MAX_COLS; i += 1) {
    if (result[i] === "correct") continue;

    const ch = guess[i];
    if (letterCount[ch] > 0) {
      result[i] = "present";
      letterCount[ch] -= 1;
    }
  }

  return result;
}

export function mergeKeyboardStatuses(previousStatuses, guess, evaluation) {
  const nextStatuses = { ...previousStatuses };

  for (let i = 0; i < MAX_COLS; i += 1) {
    const letter = guess[i];
    const incomingStatus = evaluation[i];
    const existingStatus = nextStatuses[letter];

    if (!existingStatus || STATUS_PRIORITY[incomingStatus] > STATUS_PRIORITY[existingStatus]) {
      nextStatuses[letter] = incomingStatus;
    }
  }

  return nextStatuses;
}

export function isEditableElement(element) {
  if (!element) return false;

  const tagName = element.tagName;
  return (
    element.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}
