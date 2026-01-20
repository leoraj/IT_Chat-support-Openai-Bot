export function parseTicketFromReply(reply) {
  if (!reply || typeof reply !== "string") return null;

  const lines = reply.split("\n").map(l => l.trim()).filter(Boolean);

  if (!lines[0].startsWith("TICKET_READY")) return null;

  const ticket = {
    issueSummary: "",
    userImpact: "",
    troubleshootingDone: "",
    category: "",
    priority: ""
  };

  for (const line of lines.slice(1)) {
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();

    switch (key.toLowerCase()) {
      case "issue summary":
        ticket.issueSummary = value;
        break;
      case "user impact":
        ticket.userImpact = value;
        break;
      case "troubleshooting done":
        ticket.troubleshootingDone = value;
        break;
      case "category":
        ticket.category = value;
        break;
      case "priority":
        ticket.priority = value;
        break;
    }
  }

  return ticket.issueSummary ? ticket : null;
}