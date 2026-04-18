export default function MessageBar({ message, isVisible }) {
  return (
    <div id="message" aria-live="polite" className={isVisible ? "visible" : ""}>
      {message}
    </div>
  );
}
