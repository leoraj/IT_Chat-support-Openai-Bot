const API_BASE = "http://localhost:5000";

export async function sendChatMessage(message, history = [], context = {}) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, context })
  });

  return res.json();
}

export async function createTicket(issueSummary, conversation, user) {
  const res = await fetch(`${API_BASE}/chat/ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issueSummary, conversation, user })
  });

  return res.json();
}