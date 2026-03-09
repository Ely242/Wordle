const board = document.getElementById("board");
const keyboard = document.getElementById("keyboard");
const messageContainer = document.getElementById("message");

let tiles; // Will be set after createBoard()

let currentRow = 0;
let currentCol = 0;
const MAX_ROWS = 6;
const MAX_COLS = 5;
let targetWord = "";
let gameOver = false;
let activeGameToken = 0;
let animationTimeoutIds = [];
let messageTimeoutId = null;

const keyRows = [
    [..."QWERTYUIOP"],
    [..."ASDFGHJKL"],
    [..."ZXCVBNM"]
];

// API stuff

// title field is "No Definitions Found" when word is invalid
const dictionaryURL = "https://api.dictionaryapi.dev/api/v2/entries/en/";

const randomWordURL = "https://random-word-api.herokuapp.com/word?length=5&number=1&diff=3";

// ----------------------------
// Board + Keyboard Creation
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

    keyRows.forEach((letters, rowIndex) => {
        const row = document.createElement("div");
        row.classList.add("key-row", `key-row-${rowIndex + 1}`);

        if (rowIndex === 2) {
            row.appendChild(createKey("ENTER", true));
        }

        letters.forEach(letter => {
            row.appendChild(createKey(letter));
        });

        if (rowIndex === 2) {
            row.appendChild(createKey("⌫", true));
        }

        keyboard.appendChild(row);
    });
}

function createKey(label, isLarge = false) {
    const key = document.createElement("button");
    key.type = "button";
    key.classList.add("key");
    if (isLarge) {
        key.classList.add("large");
    }
    key.textContent = label;
    return key;
}

// ----------------------------
// Input Handling
// ----------------------------

function registerInputHandlers() {
    document.addEventListener("keydown", handlePhysicalKey);

    const keys = document.querySelectorAll(".key");
    keys.forEach(key => {
        key.addEventListener("click", () => {
            handleOnScreenKey(key.textContent);
        });
    });
}

function queueAnimationTimeout(callback, delay) {
    const timeoutId = window.setTimeout(callback, delay);
    animationTimeoutIds.push(timeoutId);
    return timeoutId;
}

function clearAnimationTimeouts() {
    animationTimeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
    animationTimeoutIds = [];
}

function resetKeyboardStatus() {
    const keyboardKeys = keyboard.querySelectorAll(".key");
    keyboardKeys.forEach(key => {
        key.classList.remove("correct", "present", "absent");
    });
}

function initGame() {
    activeGameToken++;
    const thisGameToken = activeGameToken;

    gameOver = false;
    currentRow = 0;
    currentCol = 0;
    targetWord = "";
    clearAnimationTimeouts();
    clearMessage(true);
    createBoard();
    resetKeyboardStatus();

    fetch(randomWordURL)
    .then(response => response.json())
    .then(data => {
        if (thisGameToken !== activeGameToken) return;
        targetWord = data[0].toUpperCase();
        console.log("Target Word:", targetWord);
    })
    .catch(error => {
        if (thisGameToken !== activeGameToken) return;
        console.error("Error fetching target word:", error);
        targetWord = "APPLE"; // Fallback word
    });

}

function handlePhysicalKey(event) {
    const key = event.key.toUpperCase();

    if (key === "BACKSPACE") {
        deleteLetter();
        return;
    }
    else if (key === "ENTER") {
        submitGuess();
        return;
    }
    else if (/^[A-Z]$/.test(key)) {
        insertLetter(key);
        return;
    }
}

function handleOnScreenKey(key) {
    if (key === "ENTER") {
        submitGuess();
        return;
    }
    if (key === "⌫") {
        deleteLetter();
        return;
    }
    if (/^[A-Z]$/.test(key)) {
        insertLetter(key);
    }
}

// ----------------------------
// Row / Tile Management
// ----------------------------

function deleteLetter() {
    if (gameOver) return;
    if (currentCol === 0 || currentRow >= MAX_ROWS) return;

    currentCol--;
    const tileIndex = currentRow * MAX_COLS + currentCol;
    const tile = tiles[tileIndex];

    tile.textContent = "";
    tile.classList.remove("filled");
}

function getCurrentGuess() {
    if (currentCol < MAX_COLS) return "";

    let guess = "";
    for (let i = 0; i < MAX_COLS; i++) {
        guess += tiles[currentRow * MAX_COLS + i].textContent;
    }
    return guess;
}

function lockCurrentRow() {
    for (let i = 0; i < MAX_COLS; i++) {
        const tileIndex = currentRow * MAX_COLS + i;
        tiles[tileIndex].classList.add("locked");
    }
}

// ----------------------------
// Game Logic
// ----------------------------

async function isRealWord(word){
    const url = dictionaryURL + word.toLowerCase();
    try {
        const response = await fetch(url);

        if (!response.ok || response.status === 404)
            return false;

        const data = await response.json();
        if (data.title && data.title === "No Definitions Found") {
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error checking word validity:", error);
        return false;

    }
}

async function submitGuess() {
    if (gameOver) return;
    if (!targetWord) {
        showMessage("Loading word...");
        return;
    }

    const guess = getCurrentGuess();

    if (guess.length < MAX_COLS) {
        showMessage("Not enough letters");
        return;
    }

    if (!await isValidGuess(guess)) {
        showMessage("Invalid word");
        shakeRow(currentRow);
        return;
    }

    const evaluation = evaluateGuess(guess, targetWord);
    colorRowTiles(currentRow, evaluation);
    updateKeyboard(guess, evaluation);

    if (isWinningGuess(guess)) {
        handleWin();
        return;
    }

    advanceRow();

    if (currentRow === MAX_ROWS) {
        handleLose();
    }
}


async function isValidGuess(guess) {
    if (guess.length !== MAX_COLS) 
        return false;
    return await isRealWord(guess);
}

function isWinningGuess(guess) {
    return guess === targetWord;
}

// ----------------------------
// Tile Evaluation
// ----------------------------

function evaluateGuess(guess, target) {
    const result = Array(MAX_COLS).fill("absent");

    const letterCount = {};
    for (let ch of target) {
        letterCount[ch] = (letterCount[ch] || 0) + 1;
    }

    // First pass: mark correct
    for (let i = 0; i < MAX_COLS; i++) {
        if (guess[i] === target[i]) {
            result[i] = "correct";
            letterCount[guess[i]]--;
        }
    }

    // Second pass: mark present
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

function colorRowTiles(rowIndex, evaluation) {
    for (let i = 0; i < MAX_COLS; i++) {
        const tile = tiles[rowIndex * MAX_COLS + i];
        queueAnimationTimeout(() => {
            tile.classList.add("flip");
            queueAnimationTimeout(() => {
                tile.classList.remove("flip");
                tile.classList.add(evaluation[i]);
            }, 250);
        }, i * 300);
    }
}

// ----------------------------
// Keyboard Updating
// ----------------------------

function updateKeyboardKey(letter, status) {
    const key = Array.from(keyboard.querySelectorAll(".key"))
        .find(k => k.textContent === letter);

    if (!key) return;

    const current = key.classList.contains("correct") ? "correct" :
                    key.classList.contains("present") ? "present" :
                    key.classList.contains("absent") ? "absent" : null;

    const priority = { absent: 1, present: 2, correct: 3 };

    if (current && priority[current] >= priority[status]) return;

    key.classList.remove("correct", "present", "absent");
    key.classList.add(status);
}

function updateKeyboard(guess, evaluation) {
    for (let i = 0; i < MAX_COLS; i++) {
        updateKeyboardKey(guess[i], evaluation[i]);
    }
}

// ----------------------------
// Row Progression & End States
// ----------------------------
function advanceRow() {
    lockCurrentRow();
    currentRow++;
    currentCol = 0;
}

function handleWin() {
    gameOver = true;
    showMessage("You win!");

    const row = document.getElementById(`row-${currentRow}`);
    row.classList.add("bounce");
}

function handleLose() {
    gameOver = true;
    showMessage(`You lose. Word: ${targetWord}`);
}

// ----------------------------
// Messaging
// ----------------------------

function showMessage(text) {
    if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
        messageTimeoutId = null;
    }

    messageContainer.textContent = text;
    messageContainer.classList.add("visible");
    messageTimeoutId = window.setTimeout(clearMessage, 2000);
}

function clearMessage(immediate = false) {
    if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
        messageTimeoutId = null;
    }

    messageContainer.textContent = "";
    if (immediate) {
        messageContainer.classList.remove("visible");
        return;
    }

    messageTimeoutId = window.setTimeout(() => {
        messageContainer.classList.remove("visible");
        messageTimeoutId = null;
    }, 300);
}

// ----------------------------
// Animations
// ----------------------------
function shakeRow(rowIndex) {
    const currRow = document.getElementById(`row-${rowIndex}`);
    currRow.classList.add("shake");
    queueAnimationTimeout(() => currRow.classList.remove("shake"), 600);
}

function insertLetter(letter){
    if (gameOver) return;
    if (currentCol >= MAX_COLS || currentRow >= MAX_ROWS)
        return;
    const tileIndex = currentRow * MAX_COLS + currentCol;
    const tile = tiles[tileIndex];

    tile.textContent = letter;
    tile.classList.add("filled");

    tile.classList.add("pop");
    queueAnimationTimeout(() => tile.classList.remove("pop"), 150);

    currentCol++;
}

// Reload button handler
document.getElementById("reload").addEventListener("click", () => {
    initGame();
});

// ----------------------------
// Initialize
// ----------------------------

createKeyboard();
registerInputHandlers();
initGame();
