# Wordle React

A Wordle clone rebuilt with React + Vite.

## Features

- 6x5 Wordle gameplay with duplicate-letter aware scoring.
- Physical keyboard and on-screen keyboard input.
- Random target word fetching with stale-request guard.
- Local word-list validation from `public/words.txt`.
- Smooth staggered tile reveals, row shake, tile pop, and win bounce animations.
- New game reset flow that clears pending animation/message timers.

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Build production assets:

```bash
npm run build
```

4. Preview the production build:

```bash
npm run preview
```

## Project Structure

```
/
├── index.html
├── package.json
├── styles.css
├── public/
│   └── words.txt
├── src/
│   ├── App.jsx
│   └── main.jsx
└── vite.config.js
```

## Notes

- If the random word API is unavailable, the game falls back to a backup word.
- If `words.txt` fails to load, the app stays playable and accepts any 5-letter guess.

## License

MIT
