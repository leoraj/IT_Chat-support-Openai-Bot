import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import chatRoutes from "./routes/chat.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// =======================================
// BASIC HEALTH CHECK
// =======================================
app.get("/health", (req, res) => {
  return res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    azureConfigured:
      !!process.env.AZURE_OPENAI_ENDPOINT &&
      !!process.env.AZURE_OPENAI_KEY &&
      !!process.env.AZURE_OPENAI_DEPLOYMENT &&
      !!process.env.AZURE_OPENAI_API_VERSION,
    searchConfigured:
      !!process.env.AZURE_SEARCH_ENDPOINT &&
      !!process.env.AZURE_SEARCH_INDEX &&
      !!process.env.AZURE_SEARCH_API_VERSION &&
      !!process.env.AZURE_SEARCH_KEY,
    desk365Configured: !!process.env.DESK365_API_KEY
  });
});

// =======================================
// DEEP HEALTH CHECK (FULL SYSTEM DIAGNOSTICS)
// =======================================
app.get("/health/deep", async (req, res) => {
  const start = Date.now();

  const results = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTimeMs: 0,
    checks: {
      azureOpenAI: { ok: false, message: "" },
      azureSearch: { ok: false, message: "" },
      desk365: { ok: false, message: "" }
    }
  };

  // -------------------------------
  // 1. Check Azure OpenAI
  // -------------------------------
  try {
    const url = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`;

    await axios.post(
      url,
      {
        messages: [{ role: "user", content: "ping" }],
        max_completion_tokens: 5
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_KEY
        }
      }
    );

    results.checks.azureOpenAI.ok = true;
    results.checks.azureOpenAI.message = "Azure OpenAI reachable";
  } catch (err) {
    results.checks.azureOpenAI.ok = false;
    results.checks.azureOpenAI.message =
      err.response?.data || err.message || "Unknown error";
    results.status = "DEGRADED";
  }

  // -------------------------------
  // 2. Check Azure Search
  // -------------------------------
  try {
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${process.env.AZURE_SEARCH_INDEX}/docs/search?api-version=${process.env.AZURE_SEARCH_API_VERSION}`;

    await axios.post(
      url,
      { search: "test", top: 1 },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_SEARCH_KEY
        }
      }
    );

    results.checks.azureSearch.ok = true;
    results.checks.azureSearch.message = "Azure Search reachable";
  } catch (err) {
    results.checks.azureSearch.ok = false;
    results.checks.azureSearch.message =
      err.response?.data || err.message || "Unknown error";
    results.status = "DEGRADED";
  }

  // -------------------------------
  // 3. Check Desk365
  // -------------------------------
  try {
    const url = `${process.env.DESK365_BASE_URL}/tickets`;

    await axios.get(url, {
      headers: {
        "x-api-key": process.env.DESK365_API_KEY
      }
    });

    results.checks.desk365.ok = true;
    results.checks.desk365.message = "Desk365 reachable";
  } catch (err) {
    results.checks.desk365.ok = false;
    results.checks.desk365.message =
      err.response?.data || err.message || "Unknown error";
    results.status = "DEGRADED";
  }

  // -------------------------------
  // Finalize response time
  // -------------------------------
  results.responseTimeMs = Date.now() - start;

  return res.json(results);
});

// =======================================
// ROUTES
// =======================================
app.use("/chat", chatRoutes);

// =======================================
// START SERVER
// =======================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});