# Wordle

A Wordle clone built with HTML, CSS, and JavaScript.

## Features

- 6x5 Wordle gameplay.
- Physical keyboard and on-screen keyboard input.
- Random target word selection from `public/answers.txt`.
- Word validation from `public/words.txt`.
- Refined reveal flow: tile color swaps at flip midpoint, keyboard updates after row reveal completes.
- Smooth row shake, tile pop, and staggered per-tile win bounce animations.
- Input lock during reveal animations to prevent accidental mid-turn typing/submits.
- New Game button to restart instantly.
- Responsive layout tuned for desktop and mobile with safe-area support.
- Accessibility improvements: semantic landmarks, status messaging, and keyboard focus-visible states.

## Controls

- Type letters with your physical keyboard or click/tap the on-screen keys.
- `Enter` submits a 5-letter guess.
- `Backspace` or `⌫` removes the last letter.
- `New Game` starts a fresh board and fetches a new target word.

## Run Locally

No build step is required.

Option 1: Open `index.html` directly.

- The game still works if local file loading blocks `public/words.txt`; in that case it accepts any 5-letter guess.

Option 2 (recommended): Serve the folder over HTTP.

From this project root, run one of these:

```bash
python -m http.server 8000
```

or

```bash
npx serve .
```

Then open the shown local URL in your browser.

## Project Structure

```
/
|-- index.html
|-- styles.css
|-- script.js
|-- public/
|   |-- answers.txt
|   |-- words.txt
|   `-- assets/
|       `-- wordle-logo.png
|-- .gitignore
|-- LICENSE
`-- README.md
```

## Notes

- If the random word API is unavailable, the game falls back to a backup word.
- If `public/answers.txt` fails to load, the game uses a backup answer.
- If `public/words.txt` fails to load (for example when opened with strict `file://` restrictions), the game remains playable and accepts any 5-letter guess.

## License

MIT

