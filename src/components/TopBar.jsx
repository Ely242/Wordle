export default function TopBar({ onNewGame }) {
  return (
    <header id="topbar">
      <div id="title">Wordle</div>
      <button id="reload" type="button" onClick={onNewGame}>
        New Game
      </button>
    </header>
  );
}
