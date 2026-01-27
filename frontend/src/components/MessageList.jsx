export default function MessageList({ messages, loading }) {
  return (
    <div className="chat-box">
      {messages.map((m, i) => (
        <div key={i} className={`msg ${m.role}`}>
          <strong>{m.role === "user" ? "You" : "Bot"}:</strong> {m.content}
        </div>
      ))}

      {loading && (
        <div className="msg bot">
          <strong>Bot:</strong> Thinking...
        </div>
      )}
    </div>
  );
}