import express from "express";
import axios from "axios";

const router = express.Router();

/* ============================================================
   Azure Search: Knowledge Base Integration
   ============================================================ */
async function searchAzureKB(query) {
  try {
    const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
    const index = process.env.AZURE_SEARCH_INDEX;
    const apiVersion = process.env.AZURE_SEARCH_API_VERSION;
    const apiKey = process.env.AZURE_SEARCH_KEY;

    if (!endpoint || !index || !apiVersion || !apiKey) {
      console.warn("⚠️ Azure Search env vars missing.");
      return null;
    }

    const url = `${endpoint}/indexes/${index}/docs/search?api-version=${apiVersion}`;
    const payload = { search: query, top: 3, queryType: "simple" };

    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
      }
    });

    if (!response.data || !Array.isArray(response.data.value)) return null;

    return response.data.value.map(doc => {
      const title = doc.title || doc.Subject || "KB Article";
      const summary = doc.summary || doc.Description || doc.content || "";
      return `${title} – ${summary}`;
    });
  } catch (err) {
    console.error("❌ Azure Search Error:", err.message);
    return null;
  }
}

/* ============================================================
   Build Messages with System Prompt
   ============================================================ */
function buildMessages(history, userMessage, kbResults, context = {}) {
  const { tenantId, companyName, tone, verbosity } = context;

  const resolvedTone = tone || "professional";
  const resolvedVerbosity = verbosity || "concise";
  const resolvedCompany = companyName || "the organization";

  const messages = [];

  messages.push({
    role: "system",
    content:
      `You are an IT Support Assistant for ${resolvedCompany}.\n` +
      (resolvedTone === "friendly"
        ? "Use a friendly, helpful tone.\n"
        : "Use a professional, neutral tone.\n") +
      (resolvedVerbosity === "detailed"
        ? "Provide detailed troubleshooting.\n"
        : "Keep responses concise.\n") +
      "Rules:\n" +
      "- Ask ONE smart diagnostic question at a time.\n" +
      "- Never ask multiple questions in one reply.\n" +
      "- Wait for user reply before continuing.\n" +
      "- Use KB articles first if available.\n" +
      "- If user says 'create ticket', respond with:\n" +
      "TICKET_READY\nIssue Summary: ...\nUser Impact: ...\nTroubleshooting Done: ...\nCategory: ...\nPriority: ...\n"
  });

  messages.push({
    role: "system",
    content:
      "Topic Guidance:\n" +
      "Outlook: send/receive, launch, profile\n" +
      "VPN: connect vs disconnect, error codes\n" +
      "WiFi: SSID, slow, others affected\n" +
      "Printer: offline, USB/network\n" +
      "Windows: boot, slowness, updates\n" +
      "Teams: sign-in, meetings, audio\n" +
      "Password: forgot vs locked\n" +
      "Network: single vs multiple users\n"
  });

  if (kbResults && kbResults.length > 0) {
    messages.push({
      role: "system",
      content:
        "Relevant Knowledge Base Articles:\n" +
        kbResults.join("\n") +
        "\nUse these first."
    });
  }

  if (Array.isArray(history)) {
    history.forEach(h => messages.push(h));
  }

  messages.push({ role: "user", content: userMessage });

  return messages;
}

/* ============================================================
   Chat Endpoint (Azure OpenAI)
   ============================================================ */
router.post("/", async (req, res) => {
  const { message, history = [], context = {} } = req.body;

  try {
    const kbResults = await searchAzureKB(message);
    const messages = buildMessages(history, message, kbResults, context);

    const azureUrl = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`;

    const response = await axios.post(
      azureUrl,
      { messages, max_completion_tokens: 200 },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_KEY
        }
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.json({
        reply: "⚠️ Bot could not respond due to a backend error. Please try again."
      });
    }

    return res.json({ reply });

  } catch (err) {
    console.error("❌ Azure OpenAI Error:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("Message:", err.message);
    }

    return res.json({
      reply: "⚠️ Bot could not respond due to a backend error. Please try again."
    });
  }
});

/* ============================================================
   Desk365 Ticket Creation Endpoint (Corrected)
   ============================================================ */
router.post("/ticket", async (req, res) => {
  const { issueSummary, conversation, user } = req.body;

  try {
    // Correct Desk365 v3 ticket creation endpoint
 
     const deskUrl = `${process.env.DESK365_BASE_URL}/tickets/create`;

    const response = await axios.post(
      deskUrl,
      {
        subject: issueSummary,
        description: conversation,
        requester: user
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.DESK365_API_KEY
        }
      }
    );

    return res.json({
      success: true,
      number: response.data.ticketNumber
    });

  } catch (err) {
    console.error("❌ Desk365 Error:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("Message:", err.message);
    }

    return res.json({
      success: false,
      message: "Desk365 ticket creation failed"
    });
  }
});

export default router;