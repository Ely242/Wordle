# Wordle

A Wordle clone built with plain HTML, CSS, and JavaScript.

## Features

- 6x5 Wordle gameplay.
- Physical keyboard and on-screen keyboard input.
- Random target word fetching with stale-request guard.
- Word validation from `public/words.txt`.
- Smooth staggered tile reveals, row shake, tile pop, and win bounce animations.
- New Game button to restart instantly.

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
|-- wordle-logo.png
|-- public/
|   `-- words.txt
|-- .gitignore
|-- LICENSE
`-- README.md
```

## Notes

- If the random word API is unavailable, the game falls back to a backup word.
- If `public/words.txt` fails to load, the game remains playable and accepts any 5-letter guess.

## License

MIT

