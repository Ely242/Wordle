export default function Keyboard({ keyRows, keyStatuses, onKeyPress }) {
  return (
    <div id="keyboard">
      {keyRows.map((rowKeys, rowIndex) => (
        <div key={`keys-${rowIndex}`} className={`key-row key-row-${rowIndex + 1}`}>
          {rowKeys.map((label) => {
            const isLetter = /^[A-Z]$/.test(label);
            const status = isLetter ? keyStatuses[label] : "";
            const className = [
              "key",
              label === "ENTER" || label === "⌫" ? "large" : "",
              status
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={label}
                type="button"
                className={className}
                onClick={() => onKeyPress(label)}
              >
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
