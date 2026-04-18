export const MAX_ROWS = 6;
export const MAX_COLS = 5;

export const RANDOM_WORD_URL =
  "https://random-word-api.herokuapp.com/word?length=5&number=1&diff=2";

export const KEY_ROWS = [
  [..."QWERTYUIOP"],
  [..."ASDFGHJKL"],
  ["ENTER", ...[..."ZXCVBNM"], "⌫"]
];

export const STATUS_PRIORITY = {
  absent: 1,
  present: 2,
  correct: 3
};
