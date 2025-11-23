const board = document.getElementById("board");
const keyboard = document.getElementById("keyboard");
const messageContainer = document.getElementById("message");

let tiles; // Will be set after createBoard()

let currentRow = 0;
let currentCol = 0;
const MAX_ROWS = 6;
const MAX_COLS = 5;
let targetWord = "";

const keys = [
    ..."QWERTYUIOP",
    ..."ASDFGHJKL",
    ..."ZXCVBNM"
];

// API stuff

// title field is "No Definitions Found" when word is invalid
const dictionaryURL = "https://api.dictionaryapi.dev/api/v2/entries/en/";

const randomWordURL = "https://random-word-api.vercel.app/api?words=1&length=5&type=capitalized";

// ----------------------------
// Board + Keyboard Creation
// ----------------------------

function createBoard() {
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
    keys.forEach(letter => {
        const key = document.createElement("div");
        key.classList.add("key");
        key.textContent = letter;
        keyboard.appendChild(key);
    });

    const enter = document.createElement("div");
    enter.classList.add("key", "large");
    enter.textContent = "ENTER";

    const back = document.createElement("div");
    back.classList.add("key", "large");
    back.textContent = "⌫";

    keyboard.appendChild(enter);
    keyboard.appendChild(back);
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

function initGame() {
    currentRow = 0;
    currentCol = 0;
    clearMessage();
    tiles.forEach(tile => {
        tile.textContent = "";
        tile.className = "tile";
    });

    const keyboardKeys = keyboard.querySelectorAll(".key");
    keyboardKeys.forEach(key => {
        key.className = "key";
    });

    fetch(randomWordURL)
    .then(response => response.json())
    .then(data => {
        targetWord = data[0].toUpperCase();
        console.log("Target Word:", targetWord);
    }
    )
    .catch(error => {
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

function insertLetter(letter) {
    if (currentCol >= MAX_COLS || currentRow >= MAX_ROWS) return;

    const tileIndex = currentRow * MAX_COLS + currentCol;
    const tile = tiles[tileIndex];

    tile.textContent = letter;
    tile.classList.add("filled");

    currentCol++;
}

function deleteLetter() {
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
        const tile = document.querySelector(`#row-${rowIndex}`).children[i];
        setTimeout(() => {
            tile.classList.add("flip");
            setTimeout(() => {
                tile.classList.remove("flip");
                tile.classList.add(evaluation[i]);
            }, 300);
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
    showMessage("You win!");

    const row  = document.getElementById(`row-${currentRow}`);
    const tilesInRow = row.children;

    for (let i = 0; i < MAX_COLS; i++){
        setTimeout(() => {
            tilesInRow[i].classList.add("win-bounce");
        }, i * 200);
    }
}

function handleLose() {
    showMessage(`You lose. Word: ${targetWord}`);
}

// ----------------------------
// Messaging
// ----------------------------

function showMessage(text) {
    messageContainer.textContent = text;
    messageContainer.classList.add("visible");
    setTimeout(clearMessage, 2000);
}

function clearMessage() {
    messageContainer.textContent = "";
    messageContainer.classList.remove("visible");
}

// ----------------------------
// Animations
// ----------------------------
function shakeRow(row) {
    const currRow = document.getElementById(`row-${rowIndex}`);
    currRow.classList.add("shake");
    setTimeout(() => currRow.classList.remove("shake"), 600);
}

function insertLetter(letter){
    if (currentCol >= MAX_COLS || currentRow >= MAX_ROWS)
        return;
    const tileIndex = currentRow * MAX_COLS + currentCol;
    const tile = tiles[tileIndex];

    tile.textContent = letter;
    tile.classList.add("filled");

    tile.classList.add("pop");
    setTimeout(() => tile.classList.remove("pop"), 150);

    currentCol++;
}

// Reload button handler
document.getElementById("reload").addEventListener("click", () => {
    initGame();
});

// ----------------------------
// Initialize
// ----------------------------

createBoard();
createKeyboard();
registerInputHandlers();
initGame();
