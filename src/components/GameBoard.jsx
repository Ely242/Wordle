export default function GameBoard({
  boardLetters,
  tileStatuses,
  revealRows,
  popTiles,
  shakingRow,
  bouncingRow
}) {
  return (
    <div id="board">
      {boardLetters.map((rowLetters, rowIndex) => {
        const rowClassName = [
          "row",
          shakingRow === rowIndex ? "shake" : "",
          bouncingRow === rowIndex ? "bounce" : ""
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div key={`row-${rowIndex}`} id={`row-${rowIndex}`} className={rowClassName}>
            {rowLetters.map((letter, colIndex) => {
              const status = tileStatuses[rowIndex][colIndex];
              const tileId = `${rowIndex}-${colIndex}`;
              const tileClassName = [
                "tile",
                letter ? "filled" : "",
                status,
                revealRows[rowIndex] && status ? "reveal" : "",
                popTiles[tileId] ? "pop" : ""
              ]
                .filter(Boolean)
                .join(" ");

              const style = revealRows[rowIndex] && status
                ? { "--flip-delay": `${colIndex * 140}ms` }
                : undefined;

              return (
                <div key={tileId} className={tileClassName} style={style}>
                  {letter}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
