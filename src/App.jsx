import { useCallback, useEffect, useRef, useState } from "react";
import GameBoard from "./components/GameBoard";
import Keyboard from "./components/Keyboard";
import MessageBar from "./components/MessageBar";
import TopBar from "./components/TopBar";
import { KEY_ROWS, MAX_COLS, MAX_ROWS, RANDOM_WORD_URL } from "./constants/game";
import {
  createEmptyGrid,
  evaluateGuess,
  isEditableElement,
  mergeKeyboardStatuses
} from "./utils/gameUtils";

export default function App() {
  const [boardLetters, setBoardLetters] = useState(() => createEmptyGrid(""));
  const [tileStatuses, setTileStatuses] = useState(() => createEmptyGrid(""));
  const [revealRows, setRevealRows] = useState(() => Array(MAX_ROWS).fill(false));
  const [popTiles, setPopTiles] = useState({});
  const [keyStatuses, setKeyStatuses] = useState({});

  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [targetWord, setTargetWord] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [isTargetWordLoading, setIsTargetWordLoading] = useState(false);
  const [allowedWords, setAllowedWords] = useState(null);
  const [isRevealing, setIsRevealing] = useState(false);

  const [shakingRow, setShakingRow] = useState(null);
  const [bouncingRow, setBouncingRow] = useState(null);

  const [message, setMessage] = useState("");
  const [isMessageVisible, setIsMessageVisible] = useState(false);

  const activeGameTokenRef = useRef(0);
  const animationTimeoutIdsRef = useRef([]);
  const messageTimeoutIdRef = useRef(null);
  const messageFadeTimeoutIdRef = useRef(null);

  const queueAnimationTimeout = useCallback((callback, delay) => {
    const timeoutId = window.setTimeout(callback, delay);
    animationTimeoutIdsRef.current.push(timeoutId);
    return timeoutId;
  }, []);

  const clearAnimationTimeouts = useCallback(() => {
    animationTimeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    animationTimeoutIdsRef.current = [];
  }, []);

  const clearMessage = useCallback((immediate = false) => {
    if (messageTimeoutIdRef.current) {
      clearTimeout(messageTimeoutIdRef.current);
      messageTimeoutIdRef.current = null;
    }

    if (messageFadeTimeoutIdRef.current) {
      clearTimeout(messageFadeTimeoutIdRef.current);
      messageFadeTimeoutIdRef.current = null;
    }

    if (immediate) {
      setMessage("");
      setIsMessageVisible(false);
      return;
    }

    setIsMessageVisible(false);
    messageFadeTimeoutIdRef.current = window.setTimeout(() => {
      setMessage("");
      messageFadeTimeoutIdRef.current = null;
    }, 220);
  }, []);

  const showMessage = useCallback((text) => {
    if (messageTimeoutIdRef.current) {
      clearTimeout(messageTimeoutIdRef.current);
      messageTimeoutIdRef.current = null;
    }

    if (messageFadeTimeoutIdRef.current) {
      clearTimeout(messageFadeTimeoutIdRef.current);
      messageFadeTimeoutIdRef.current = null;
    }

    setMessage(text);
    setIsMessageVisible(true);

    messageTimeoutIdRef.current = window.setTimeout(() => {
      clearMessage(false);
    }, 2000);
  }, [clearMessage]);

  const triggerPopTile = useCallback((rowIndex, colIndex) => {
    const tileKey = `${rowIndex}-${colIndex}`;
    setPopTiles((previous) => ({ ...previous, [tileKey]: true }));

    queueAnimationTimeout(() => {
      setPopTiles((previous) => {
        if (!previous[tileKey]) return previous;
        const next = { ...previous };
        delete next[tileKey];
        return next;
      });
    }, 160);
  }, [queueAnimationTimeout]);

  const triggerShakeRow = useCallback((rowIndex) => {
    setShakingRow(rowIndex);
    queueAnimationTimeout(() => {
      setShakingRow((current) => (current === rowIndex ? null : current));
    }, 560);
  }, [queueAnimationTimeout]);

  const startNewGame = useCallback(() => {
    activeGameTokenRef.current += 1;
    const thisGameToken = activeGameTokenRef.current;

    clearAnimationTimeouts();
    clearMessage(true);

    setBoardLetters(createEmptyGrid(""));
    setTileStatuses(createEmptyGrid(""));
    setRevealRows(Array(MAX_ROWS).fill(false));
    setPopTiles({});
    setKeyStatuses({});

    setCurrentRow(0);
    setCurrentCol(0);
    setTargetWord("");
    setGameOver(false);
    setIsTargetWordLoading(true);
    setIsRevealing(false);
    setShakingRow(null);
    setBouncingRow(null);

    fetch(RANDOM_WORD_URL)
      .then((response) => response.json())
      .then((data) => {
        if (thisGameToken !== activeGameTokenRef.current) return;

        if (!Array.isArray(data) || typeof data[0] !== "string") {
          throw new Error("Unexpected random word response format.");
        }

        const nextWord = data[0].trim().toUpperCase();
        if (nextWord.length !== MAX_COLS) {
          throw new Error("Random word response did not return a five-letter word.");
        }

        setTargetWord(nextWord);
        setIsTargetWordLoading(false);
      })
      .catch((error) => {
        if (thisGameToken !== activeGameTokenRef.current) return;
        console.error("Error fetching target word:", error);
        setTargetWord("APPLE");
        setIsTargetWordLoading(false);
        showMessage("Using backup word");
      });
  }, [clearAnimationTimeouts, clearMessage, showMessage]);

  const insertLetter = useCallback((letter) => {
    if (gameOver || isRevealing) return;
    if (currentCol >= MAX_COLS || currentRow >= MAX_ROWS) return;

    const rowIndex = currentRow;
    const colIndex = currentCol;

    setBoardLetters((previous) => {
      const next = previous.map((row) => [...row]);
      next[rowIndex][colIndex] = letter;
      return next;
    });

    setCurrentCol(colIndex + 1);
    triggerPopTile(rowIndex, colIndex);
  }, [currentCol, currentRow, gameOver, isRevealing, triggerPopTile]);

  const deleteLetter = useCallback(() => {
    if (gameOver || isRevealing) return;
    if (currentCol === 0 || currentRow >= MAX_ROWS) return;

    const rowIndex = currentRow;
    const colIndex = currentCol - 1;

    setBoardLetters((previous) => {
      const next = previous.map((row) => [...row]);
      next[rowIndex][colIndex] = "";
      return next;
    });

    setCurrentCol(colIndex);
  }, [currentCol, currentRow, gameOver, isRevealing]);

  const submitGuess = useCallback(() => {
    if (gameOver || isRevealing) return;

    if (isTargetWordLoading || !targetWord) {
      showMessage("Loading word...");
      return;
    }

    if (!allowedWords) {
      showMessage("Loading word list...");
      return;
    }

    if (currentCol < MAX_COLS) {
      showMessage("Not enough letters");
      return;
    }

    const rowIndex = currentRow;
    const guess = boardLetters[rowIndex].join("");

    if (allowedWords.size > 0 && !allowedWords.has(guess)) {
      showMessage("Invalid word");
      triggerShakeRow(rowIndex);
      return;
    }

    const evaluation = evaluateGuess(guess, targetWord);

    setTileStatuses((previous) => {
      const next = previous.map((row) => [...row]);
      next[rowIndex] = evaluation;
      return next;
    });

    setRevealRows((previous) => {
      const next = [...previous];
      next[rowIndex] = true;
      return next;
    });

    setIsRevealing(true);

    const revealDuration = 560 + (MAX_COLS - 1) * 140;
    queueAnimationTimeout(() => {
      setKeyStatuses((previous) => mergeKeyboardStatuses(previous, guess, evaluation));
      setIsRevealing(false);

      if (guess === targetWord) {
        setGameOver(true);
        setBouncingRow(rowIndex);
        showMessage("You win!");
        return;
      }

      if (rowIndex + 1 === MAX_ROWS) {
        setGameOver(true);
        showMessage(`You lose. Word: ${targetWord}`);
        return;
      }

      setCurrentRow(rowIndex + 1);
      setCurrentCol(0);
    }, revealDuration);
  }, [
    allowedWords,
    boardLetters,
    currentCol,
    currentRow,
    gameOver,
    isRevealing,
    isTargetWordLoading,
    queueAnimationTimeout,
    showMessage,
    targetWord,
    triggerShakeRow
  ]);

  const handleOnScreenKey = useCallback((key) => {
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
  }, [deleteLetter, insertLetter, submitGuess]);

  const handleReloadClick = useCallback((event) => {
    event.currentTarget.blur();
    startNewGame();
  }, [startNewGame]);

  useEffect(() => {
    let isSubscribed = true;

    async function loadAllowedWordList() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}words.txt`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.text();
        if (!isSubscribed) return;

        const normalizedWords = data
          .split(/\r?\n/)
          .map((word) => word.trim().toUpperCase())
          .filter((word) => word.length > 0);

        setAllowedWords(new Set(normalizedWords));
      } catch (error) {
        if (!isSubscribed) return;
        console.error("Error loading words list:", error);
        setAllowedWords(new Set());
        showMessage("Word list unavailable. Any 5-letter guess is allowed.");
      }
    }

    loadAllowedWordList();

    return () => {
      isSubscribed = false;
    };
  }, [showMessage]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  useEffect(() => {
    function handlePhysicalKey(event) {
      if (isEditableElement(event.target)) return;

      const key = event.key.toUpperCase();

      if (key === "BACKSPACE") {
        event.preventDefault();
        deleteLetter();
        return;
      }

      if (key === "ENTER") {
        event.preventDefault();
        submitGuess();
        return;
      }

      if (/^[A-Z]$/.test(key)) {
        event.preventDefault();
        insertLetter(key);
      }
    }

    document.addEventListener("keydown", handlePhysicalKey);
    return () => {
      document.removeEventListener("keydown", handlePhysicalKey);
    };
  }, [deleteLetter, insertLetter, submitGuess]);

  useEffect(() => {
    return () => {
      activeGameTokenRef.current += 1;
      clearAnimationTimeouts();
      clearMessage(true);
    };
  }, [clearAnimationTimeouts, clearMessage]);

  return (
    <main>
      <TopBar onNewGame={handleReloadClick} />

      <GameBoard
        boardLetters={boardLetters}
        tileStatuses={tileStatuses}
        revealRows={revealRows}
        popTiles={popTiles}
        shakingRow={shakingRow}
        bouncingRow={bouncingRow}
      />

      <MessageBar message={message} isVisible={isMessageVisible} />

      <Keyboard keyRows={KEY_ROWS} keyStatuses={keyStatuses} onKeyPress={handleOnScreenKey} />
    </main>
  );
}
