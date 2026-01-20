import { useState } from "react";
import { sendChatMessage, createTicket } from "../apiClient";
import { getDeepHealth } from "../apiHealth";
import { parseTicketFromReply } from "../utils/ticketParser";
import TicketBanner from "./TicketBanner";

export default function ChatWindow({ userEmail }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [banner, setBanner] = useState({
    visible: false,
    ticketNumber: "",
    summary: "",
    ticketData: null
  });

  const [health, setHealth] = useState(null);

  const loadHealth = async () => {
    const data = await getDeepHealth();
    setHealth(data);
  };

  const isHealthRequest = (text) => {
    const t = text.toLowerCase();
    return (
      t.includes("health") ||
      t.includes("system status") ||
      t.includes("status") ||
      t.includes("monitoring")
    );
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");

    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);

    // 🔥 HEALTH CHECK MODE
    if (isHealthRequest(userMessage)) {
      const healthData = await getDeepHealth();
      setHealth(healthData);

      const green = "🟢";
      const red = "🔴";

      const reply =
        `System Health Status:\n\n` +
        `API Server: ${healthData.status === "OK" ? green + " Running" : red + " Down"}\n` +
        `Azure OpenAI: ${healthData.checks.azureOpenAI.ok ? green + " Healthy" : red + " Down"}\n` +
        `Azure Search: ${healthData.checks.azureSearch.ok ? green + " Healthy" : red + " Down"}\n` +
        `Desk365: ${healthData.checks.desk365.ok ? green + " Healthy" : red + " Down"}\n` +
        `Response Time: ${healthData.responseTimeMs} ms`;

      const updated = [...newMessages, { role: "assistant", content: reply }];
      setMessages(updated);
      return;
    }

    // 🔥 NORMAL BOT MODE
    setLoading(true);

    const context = {
      tenantId: "logicloops",
      companyName: "Logic Loops",
      tone: "professional",
      verbosity: "concise"
    };

    const res = await sendChatMessage(userMessage, newMessages, context);
    const reply = res.reply;

    const updatedMessages = [...newMessages, { role: "assistant", content: reply }];
    setMessages(updatedMessages);
    setLoading(false);

    // 🔥 TICKET DETECTION
    const ticket = parseTicketFromReply(reply);

    if (ticket) {
      const conversationText = updatedMessages
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");

      const issueSummary = ticket.issueSummary;
      const conversation =
        `User Impact: ${ticket.userImpact}\n` +
        `Troubleshooting Done: ${ticket.troubleshootingDone}\n` +
        `Category: ${ticket.category}\n` +
        `Priority: ${ticket.priority}\n\n` +
        `Conversation:\n${conversationText}`;

      const user = userEmail || "unknown@user";

      setBanner({
        visible: true,
        ticketNumber: "",
        summary: issueSummary,
        ticketData: { issueSummary, conversation, user }
      });
    }
  };

  const handleConfirmTicket = async () => {
    if (!banner.ticketData) return;

    const res = await createTicket(
      banner.ticketData.issueSummary,
      banner.ticketData.conversation,
      banner.ticketData.user
    );

    setBanner(prev => ({
      ...prev,
      ticketNumber: res.number
    }));
  };

  return (
    <div className="chat-container">
      {/* HEADER WITH HEALTH STATUS */}
      <div className="chat-header">
        <h2>IT Support Assistant</h2>

        <div className="health-status">
          {health ? (
            <>
              <span>API: {health.status === "OK" ? "🟢" : "🔴"}</span>
              <span>OpenAI: {health.checks.azureOpenAI.ok ? "🟢" : "🔴"}</span>
              <span>Search: {health.checks.azureSearch.ok ? "🟢" : "🔴"}</span>
              <span>Desk365: {health.checks.desk365.ok ? "🟢" : "🔴"}</span>
            </>
          ) : (
            <span>Checking...</span>
          )}
          <button className="refresh-btn" onClick={loadHealth}>↻</button>
        </div>
      </div>

      {/* TICKET BANNER */}
      <TicketBanner
        visible={banner.visible}
        ticketNumber={banner.ticketNumber}
        summary={banner.summary}
        onConfirm={handleConfirmTicket}
      />

      {/* CHAT MESSAGES */}
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

      {/* INPUT BOX */}
      <div className="chat-input">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Describe your IT issue..."
          onKeyDown={e => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}