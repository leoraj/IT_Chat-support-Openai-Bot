import axios from "axios";
import { config } from "../config.js";
import { log } from "../utils/logger.js";

/**
 * Helper: Map issue text to priority, category, group, etc.
 */
function mapIssueMetadata(issueText = "") {
  const text = issueText.toLowerCase();

  // Default metadata
  const meta = {
    priority: 3,              // 1 = highest, 3 = normal
    category: "General",
    sub_category: null,
    group: "IT Support",
    isUrgent: false
  };

  // Critical / P1 keywords
  if (
    text.includes("server down") ||
    text.includes("production down") ||
    text.includes("prod down") ||
    text.includes("vpn down") ||
    text.includes("cannot log in") ||
    text.includes("can’t log in") ||
    text.includes("can't log in") ||
    text.includes("login issue") ||
    text.includes("login problem") ||
    text.includes("critical") ||
    text.includes("urgent")
  ) {
    meta.priority = 1;
    meta.category = "Critical Incident";
    meta.group = "Infrastructure";
    meta.isUrgent = true;
    return meta;
  }

  // High priority but not full outage
  if (
    text.includes("vpn") ||
    text.includes("remote access") ||
    text.includes("outlook") ||
    text.includes("email") ||
    text.includes("printer") ||
    text.includes("print") ||
    text.includes("windows server") ||
    text.includes("server") ||
    text.includes("teams") ||
    text.includes("meeting")
  ) {
    meta.priority = 2;
  }

  // Category / group mapping by topic
  if (text.includes("outlook") || text.includes("email")) {
    meta.category = "Email Issues";
    meta.group = "Messaging";
  } else if (text.includes("vpn") || text.includes("remote access")) {
    meta.category = "Connectivity";
    meta.group = "Network";
  } else if (text.includes("printer") || text.includes("print")) {
    meta.category = "Printing";
    meta.group = "Hardware Support";
  } else if (text.includes("windows server") || text.includes("server")) {
    meta.category = "Server Issues";
    meta.group = "Infrastructure";
  } else if (text.includes("teams") || text.includes("meeting")) {
    meta.category = "Collaboration";
    meta.group = "Messaging";
  }

  return meta;
}

/**
 * Helper: Format Desk365 ticket number to a nicer external form.
 * Example: 7  -> D365-00007
 *          48217 -> D365-48217
 */
function formatTicketNumber(rawTicketNumber) {
  if (rawTicketNumber == null) return "UNKNOWN";
  const num = Number(rawTicketNumber);
  if (Number.isNaN(num)) return String(rawTicketNumber);
  return `D365-${num.toString().padStart(5, "0")}`;
}

/**
 * Helper: Build a rich HTML description including conversation summary
 */
function buildTicketDescription(rawDescription, conversationHistory = []) {
  let description = rawDescription || "IT support issue – details below.";

  const summaryParts = [];

  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    summaryParts.push("<h3>Conversation Summary</h3><ul>");
    for (const msg of conversationHistory) {
      if (!msg || !msg.role || !msg.content) continue;
      const roleLabel =
        msg.role === "user" ? "USER" :
        msg.role === "assistant" ? "ASSISTANT" :
        msg.role.toUpperCase();

      summaryParts.push(
        `<li><strong>${roleLabel}:</strong> ${msg.content}</li>`
      );
    }
    summaryParts.push("</ul>");
  }

  const fullHtml = `
<div>
  <p>${description}</p>
  ${summaryParts.join("\n")}
</div>
  `.trim();

  return fullHtml;
}

/**
 * Create a Desk365 ticket with enhanced metadata.
 *
 * params:
 * - email: user email address
 * - shortDescription: short issue summary
 * - description: optional detailed description (if not provided, auto-derive)
 * - topic: optional topic like "Outlook", "VPN", "Printer"
 * - conversationHistory: optional array of { role, content } for summary
 */
export async function createTicket({
  email,
  shortDescription,
  description,
  topic,
  conversationHistory = []
}) {
  const baseUrl = config.ticketing.desk365BaseUrl; // e.g. https://intelli.desk365.io/apis/v3
  const url = `${baseUrl}/tickets/create`;

  const effectiveSubject =
    shortDescription ||
    topic ||
    "IT support issue – details inside";

  const issueTextForMapping =
    `${effectiveSubject} ${description || ""} ${topic || ""}`.trim();

  const meta = mapIssueMetadata(issueTextForMapping);

  const effectiveDescription =
    description ||
    shortDescription ||
    topic ||
    "IT support issue – user reported a problem that needs investigation.";

  const htmlDescription = buildTicketDescription(
    effectiveDescription,
    conversationHistory
  );

  const payload = {
    email: email || "chatbot@yourdomain.com",
    form_name: "Create Ticket",
    subject: effectiveSubject,
    description: htmlDescription,
    status: "open",
    priority: meta.priority,
    type: "Incident",
    group: meta.group,
    category: meta.category,
    sub_category: meta.sub_category,
    custom_fields: {
      // You can wire custom fields here if your Desk365 has them
      // e.g. cf_source: "AI Support Portal"
    },
    watchers: [],
    share_to: []
  };

  try {
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: config.ticketing.desk365ApiKey,
        "Content-Type": "application/json"
      }
    });

    log("Desk365 RAW RESPONSE:", JSON.stringify(res.data, null, 2));

    const rawTicketNumber =
      res.data?.ticket_number ||
      res.data?.ticket?.number ||
      res.data?.number ||
      res.data?.ticketNumber ||
      null;

    const formattedTicketNumber = formatTicketNumber(rawTicketNumber);

    return {
      success: true,
      rawTicketNumber,
      ticketNumber: formattedTicketNumber,
      priority: meta.priority,
      category: meta.category,
      group: meta.group,
      isUrgent: meta.isUrgent
    };

  } catch (err) {
    log("Desk365 ERROR:", err.response?.data || err.message);
    return {
      success: false,
      message: err.message,
      errorData: err.response?.data
    };
  }
}

/**
 * Get ticket status/details from Desk365 by ticket number.
 *
 * NOTE: Adjust the endpoint path if your Desk365 API uses a different route.
 */
export async function getTicketStatus(rawTicketNumber) {
  const baseUrl = config.ticketing.desk365BaseUrl;

  // If the bot passes in something like "D365-00007", strip the prefix.
  let ticketNumber = rawTicketNumber;
  if (typeof ticketNumber === "string" && ticketNumber.toUpperCase().startsWith("D365-")) {
    ticketNumber = ticketNumber.split("-").pop();
  }

  const url = `${baseUrl}/tickets/${ticketNumber}`;

  try {
    const res = await axios.get(url, {
      headers: {
        Authorization: config.ticketing.desk365ApiKey,
        "Content-Type": "application/json"
      }
    });

    log("Desk365 STATUS RESPONSE:", JSON.stringify(res.data, null, 2));

    return {
      success: true,
      data: {
        ticketNumber: formatTicketNumber(res.data?.ticket_number ?? ticketNumber),
        status: res.data?.status || "Unknown",
        priority: res.data?.priority,
        subject: res.data?.subject,
        assigned_to: res.data?.assigned_to || res.data?.assignedTo || null,
        group: res.data?.group || null,
        created_on: res.data?.created_on || null,
        updated_on: res.data?.updated_on || null
      }
    };

  } catch (err) {
    log("Desk365 STATUS ERROR:", err.response?.data || err.message);
    return {
      success: false,
      message: err.message,
      errorData: err.response?.data
    };
  }
}

/**
 * Attach a file to an existing Desk365 ticket.
 *
 * This assumes a generic attachments endpoint; adjust path and payload to match
 * your Desk365 API documentation if needed.
 *
 * params:
 * - rawTicketNumber: ticket number (raw or D365-00007 format)
 * - fileName: original file name (e.g. "screenshot.png")
 * - fileContentBase64: base64-encoded file content
 * - mimeType: e.g. "image/png"
 */
export async function addTicketAttachment({
  rawTicketNumber,
  fileName,
  fileContentBase64,
  mimeType
}) {
  const baseUrl = config.ticketing.desk365BaseUrl;

  let ticketNumber = rawTicketNumber;
  if (typeof ticketNumber === "string" && ticketNumber.toUpperCase().startsWith("D365-")) {
    ticketNumber = ticketNumber.split("-").pop();
  }

  // This endpoint is an example; adjust based on Desk365 docs if needed.
  const url = `${baseUrl}/tickets/${ticketNumber}/attachments`;

  const payload = {
    file_name: fileName,
    content_type: mimeType,
    content: fileContentBase64
  };

  try {
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: config.ticketing.desk365ApiKey,
        "Content-Type": "application/json"
      }
    });

    log("Desk365 ATTACHMENT RESPONSE:", JSON.stringify(res.data, null, 2));

    return {
      success: true,
      data: res.data
    };

  } catch (err) {
    log("Desk365 ATTACHMENT ERROR:", err.response?.data || err.message);
    return {
      success: false,
      message: err.message,
      errorData: err.response?.data
    };
  }
}
