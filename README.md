# Wordle

A Wordle clone built with React + Vite.

## Features

- 6x5 Wordle gameplay.
- Physical keyboard and on-screen keyboard input.
- Random target word fetching with stale-request guard.
- Local word-list validation from `public/words.txt`.
- Smooth staggered tile reveals, row shake, tile pop, and win bounce animations.
- New Game button to restart instantly.

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

You can also use:

```bash
npm start
```

Do not open `index.html` directly in the browser. This project uses Vite to transform `src/main.jsx`, so the app must be served through the Vite dev server or preview server.

3. Build production assets:

```bash
npm run build
```

4. Preview the production build:

```bash
npm run preview
```

## Repository Hygiene

- `node_modules/`, `dist/`, and `.vite/` are generated artifacts and should not be committed.
- If they were committed previously, remove them from git tracking with:

```bash
git rm -r --cached node_modules dist
```

## Project Structure

```
/
├── index.html
├── .gitignore
├── package.json
├── package-lock.json
├── styles.css
├── wordle_img.png
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

