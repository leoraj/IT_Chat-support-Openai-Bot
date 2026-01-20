export default function InputBox({ input, setInput, onSend }) {
  return (
    <div className="chat-input">
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Describe your IT issue..."
        onKeyDown={e => e.key === "Enter" && onSend()}
      />
      <button onClick={onSend}>Send</button>
    </div>
  );
}