// ----------------------------
// DOM references
// ----------------------------
const board = document.getElementById("board");
const keyboard = document.getElementById("keyboard");
const messageContainer = document.getElementById("message");
const reloadButton = document.getElementById("reload");

// ----------------------------
// Game state
// ----------------------------
const MAX_ROWS = 6;
const MAX_COLS = 5;

let tiles;                       // Set after createBoard()
let currentRow = 0;
let currentCol = 0;
let targetWord = "";
let gameOver = false;
let isTargetWordLoading = false;
let isRevealing = false;         // Blocks input during tile reveal animation
let activeGameToken = 0;         // Guards against stale async word fetches
let animationTimeoutIds = [];
let messageTimeoutId = null;

// letter -> button element (built once by createKeyboard())
const keyElements = new Map();

const keyRows = [
    [..."QWERTYUIOP"],
    [..."ASDFGHJKL"],
    [..."ZXCVBNM"],
];

// Motion tokens (kept in sync with styles.css)
const FLIP_DURATION = 560;
const FLIP_STAGGER = 300;
const totalRevealDuration = () => (MAX_COLS - 1) * FLIP_STAGGER + FLIP_DURATION;

// Random-word API: single 5-letter word, moderately common. Response: ["apple"]
const randomWordURL = "https://random-word-api.herokuapp.com/word?length=5&number=1&diff=2";
const FALLBACK_WORD = "APPLE";

let allowedWords;
let allowedWordsLoadFailed = false;

// ----------------------------
// Word list loader
// ----------------------------
async function initAllowedWordList() {
    try {
        const response = await fetch("public/words.txt");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.text();
        allowedWords = new Set(
            data
                .split(/\r?\n/)
                .map(word => word.trim().toUpperCase())
                .filter(word => word.length > 0)
        );
        allowedWordsLoadFailed = false;
        console.log(`Loaded ${allowedWords.size} allowed words.`);
    } catch (err) {
        console.error("Error loading allowed words file:", err);
        // Keep gameplay available when loaded from file:// or if fetch fails.
        allowedWords = new Set();
        allowedWordsLoadFailed = true;
    }
}

// ----------------------------
// Board + Keyboard creation
// ----------------------------
function createBoard() {
    board.innerHTML = "";
    for (let r = 0; r < MAX_ROWS; r++) {
        const row = document.createElement("div");
        row.classList.add("row");
        row.id = `row-${r}`;
        for (let c = 0; c < MAX_COLS; c++) {
            const tile = document.createElement("div");
            tile.classList.add("tile");
            row.appendChild(tile);
        }
        board.appendChild(row);
    }
    tiles = board.querySelectorAll(".tile");
}

function createKeyboard() {
    keyboard.innerHTML = "";
    keyElements.clear();

    keyRows.forEach((letters, rowIndex) => {
        const row = document.createElement("div");
        row.classList.add("key-row", `key-row-${rowIndex + 1}`);

        if (rowIndex === 2) row.appendChild(createKey("ENTER", { large: true }));
        letters.forEach(letter => row.appendChild(createKey(letter)));
        if (rowIndex === 2) row.appendChild(createKey("⌫", { large: true, label: "Backspace" }));

        keyboard.appendChild(row);
    });
}

function createKey(value, { large = false, label } = {}) {
    const key = document.createElement("button");
    key.type = "button";
    key.classList.add("key");
    if (large) key.classList.add("large");
    key.textContent = value;
    key.dataset.key = value;
    key.setAttribute("aria-label", label || value);
    keyElements.set(value, key);
    return key;
}

// ----------------------------
// Input handling
// ----------------------------
function registerInputHandlers() {
    document.addEventListener("keydown", handlePhysicalKey);
    keyboard.addEventListener("click", event => {
        const key = event.target.closest(".key");
        if (!key) return;
        handleOnScreenKey(key.dataset.key);
    });
}

function isEditableElement(el) {
    if (!el) return false;
    const tag = el.tagName;
    return el.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function handlePhysicalKey(event) {
    if (isEditableElement(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const key = event.key.toUpperCase();

    if (key === "BACKSPACE") {
        event.preventDefault();
        deleteLetter();
    } else if (key === "ENTER") {
        event.preventDefault();
        submitGuess();
    } else if (/^[A-Z]$/.test(key)) {
        event.preventDefault();
        insertLetter(key);
    }
}

function handleOnScreenKey(key) {
    if (key === "ENTER") return submitGuess();
    if (key === "⌫") return deleteLetter();
    if (/^[A-Z]$/.test(key)) insertLetter(key);
}

// ----------------------------
// Timer helpers
// ----------------------------
function queueAnimationTimeout(callback, delay) {
    const id = window.setTimeout(callback, delay);
    animationTimeoutIds.push(id);
    return id;
}

function clearAnimationTimeouts() {
    animationTimeoutIds.forEach(clearTimeout);
    animationTimeoutIds = [];
}

// ----------------------------
// Tile helpers
// ----------------------------
function tileAt(row, col) {
    return tiles[row * MAX_COLS + col];
}

function insertLetter(letter) {
    if (gameOver || isRevealing) return;
    if (currentCol >= MAX_COLS || currentRow >= MAX_ROWS) return;

    const tile = tileAt(currentRow, currentCol);
    tile.textContent = letter;
    tile.classList.add("filled");

    // retrigger pop
    tile.classList.remove("pop");
    // eslint-disable-next-line no-unused-expressions
    void tile.offsetWidth;
    tile.classList.add("pop");
    queueAnimationTimeout(() => tile.classList.remove("pop"), 160);

    currentCol++;
}

function deleteLetter() {
    if (gameOver || isRevealing) return;
    if (currentCol === 0 || currentRow >= MAX_ROWS) return;

    currentCol--;
    const tile = tileAt(currentRow, currentCol);
    tile.textContent = "";
    tile.classList.remove("filled");
}

function getCurrentGuess() {
    if (currentCol < MAX_COLS) return "";
    let guess = "";
    for (let i = 0; i < MAX_COLS; i++) guess += tileAt(currentRow, i).textContent;
    return guess;
}

// ----------------------------
// Game lifecycle
// ----------------------------
function resetKeyboardStatus() {
    keyElements.forEach(key => key.classList.remove("correct", "present", "absent"));
}

function initGame() {
    activeGameToken++;
    const thisGameToken = activeGameToken;

    gameOver = false;
    isRevealing = false;
    currentRow = 0;
    currentCol = 0;
    targetWord = "";
    isTargetWordLoading = true;

    clearAnimationTimeouts();
    clearMessage(true);
    createBoard();
    resetKeyboardStatus();

    fetch(randomWordURL)
        .then(response => response.json())
        .then(data => {
            if (thisGameToken !== activeGameToken) return;
            if (!Array.isArray(data) || typeof data[0] !== "string") {
                throw new Error("Unexpected random-word API response format.");
            }
            targetWord = data[0].trim().toUpperCase();
            isTargetWordLoading = false;
            console.log("Target Word:", targetWord);
        })
        .catch(error => {
            if (thisGameToken !== activeGameToken) return;
            console.error("Error fetching target word:", error);
            targetWord = FALLBACK_WORD;
            isTargetWordLoading = false;
            showMessage("Using backup word");
        });
}

// ----------------------------
// Guess submission
// ----------------------------
async function submitGuess() {
    if (gameOver || isRevealing) return;

    if (isTargetWordLoading || !targetWord) {
        showMessage("Loading word...");
        return;
    }
    if (!allowedWords) {
        showMessage("Loading word list...");
        return;
    }

    const guess = getCurrentGuess();
    if (guess.length < MAX_COLS) {
        showMessage("Not enough letters");
        shakeRow(currentRow);
        return;
    }
    if (!isRealWord(guess)) {
        showMessage("Not in word list");
        shakeRow(currentRow);
        return;
    }

    const evaluation = evaluateGuess(guess, targetWord);
    revealRow(currentRow, guess, evaluation);
}

function isRealWord(word) {
    if (allowedWordsLoadFailed) return /^[A-Z]{5}$/.test(word);
    return allowedWords.has(word);
}

// ----------------------------
// Evaluation
// ----------------------------
function evaluateGuess(guess, target) {
    const result = Array(MAX_COLS).fill("absent");
    const letterCount = {};
    for (const ch of target) letterCount[ch] = (letterCount[ch] || 0) + 1;

    // Pass 1: exact matches
    for (let i = 0; i < MAX_COLS; i++) {
        if (guess[i] === target[i]) {
            result[i] = "correct";
            letterCount[guess[i]]--;
        }
    }
    // Pass 2: present-in-word
    for (let i = 0; i < MAX_COLS; i++) {
        if (result[i] === "correct") continue;
        const ch = guess[i];
        if (letterCount[ch] > 0) {
            result[i] = "present";
            letterCount[ch]--;
        }
    }
    return result;
}

// ----------------------------
// Reveal animation
// ----------------------------
function revealRow(rowIndex, guess, evaluation) {
    isRevealing = true;

    for (let i = 0; i < MAX_COLS; i++) {
        const tile = tileAt(rowIndex, i);
        const delay = i * FLIP_STAGGER;

        tile.style.setProperty("--flip-delay", `${delay}ms`);
        tile.classList.remove("reveal");
        // Force reflow so the animation restarts if reveal is re-applied on the same tile.
        // eslint-disable-next-line no-unused-expressions
        void tile.offsetWidth;
        tile.classList.add("reveal");

        // Swap in the color class at the midpoint of the flip, when the tile is edge-on.
        queueAnimationTimeout(() => {
            tile.classList.add(evaluation[i]);
        }, delay + FLIP_DURATION / 2);
    }

    // After the full row finishes revealing, update the keyboard and progress the game.
    queueAnimationTimeout(() => {
        updateKeyboard(guess, evaluation);
        finishTurn(guess, rowIndex);
    }, totalRevealDuration());
}

function finishTurn(guess, rowIndex) {
    isRevealing = false;

    if (guess === targetWord) {
        handleWin(rowIndex);
        return;
    }

    currentRow++;
    currentCol = 0;

    if (currentRow === MAX_ROWS) handleLose();
}

// ----------------------------
// Keyboard status
// ----------------------------
function updateKeyboard(guess, evaluation) {
    for (let i = 0; i < MAX_COLS; i++) updateKeyboardKey(guess[i], evaluation[i]);
}

function updateKeyboardKey(letter, status) {
    const key = keyElements.get(letter);
    if (!key) return;

    const priority = { absent: 1, present: 2, correct: 3 };
    const current = key.classList.contains("correct")
        ? "correct"
        : key.classList.contains("present")
        ? "present"
        : key.classList.contains("absent")
        ? "absent"
        : null;

    if (current && priority[current] >= priority[status]) return;

    key.classList.remove("correct", "present", "absent");
    key.classList.add(status);
}

// ----------------------------
// End states
// ----------------------------
function handleWin(rowIndex) {
    gameOver = true;
    showMessage("You win!");

    const row = document.getElementById(`row-${rowIndex}`);
    if (!row) return;

    // Per-tile bounce delay via CSS var, so tiles pop one after the other.
    row.querySelectorAll(".tile").forEach((tile, i) => {
        tile.style.setProperty("--bounce-index", i);
    });
    row.classList.remove("bounce");
    // eslint-disable-next-line no-unused-expressions
    void row.offsetWidth;
    row.classList.add("bounce");
}

function handleLose() {
    gameOver = true;
    showMessage(`Answer: ${targetWord}`, { duration: 6000 });
}

// ----------------------------
// Messaging
// ----------------------------
function showMessage(text, { duration = 2000 } = {}) {
    if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
        messageTimeoutId = null;
    }

    messageContainer.innerHTML = "";
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = text;
    messageContainer.appendChild(pill);
    messageContainer.classList.add("visible");

    if (duration > 0) {
        messageTimeoutId = window.setTimeout(() => clearMessage(), duration);
    }
}

function clearMessage(immediate = false) {
    if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
        messageTimeoutId = null;
    }

    if (immediate) {
        messageContainer.classList.remove("visible");
        messageContainer.textContent = "";
        return;
    }

    messageContainer.classList.remove("visible");
    messageTimeoutId = window.setTimeout(() => {
        messageContainer.textContent = "";
        messageTimeoutId = null;
    }, 260);
}

// ----------------------------
// Row shake (invalid input)
// ----------------------------
function shakeRow(rowIndex) {
    const row = document.getElementById(`row-${rowIndex}`);
    if (!row) return;
    row.classList.remove("shake");
    // eslint-disable-next-line no-unused-expressions
    void row.offsetWidth;
    row.classList.add("shake");
    queueAnimationTimeout(() => row.classList.remove("shake"), 600);
}

// ----------------------------
// New Game
// ----------------------------
reloadButton.addEventListener("click", () => {
    // Prevent Enter from re-triggering the focused button while submitting guesses.
    reloadButton.blur();
    initGame();
});

// ----------------------------
// Bootstrap
// ----------------------------
createKeyboard();
registerInputHandlers();
initAllowedWordList();
initGame();
