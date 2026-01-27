
export async function getDeepHealth() {
  try {
    const res = await fetch("http://localhost:5000/health/deep");
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("Health check failed:", err.message);
    return {
      status: "ERROR",
      responseTimeMs: 0,
      checks: {
        azureOpenAI: { ok: false, message: "Unavailable" },
        azureSearch: { ok: false, message: "Unavailable" },
        desk365: { ok: false, message: "Unavailable" }
      }
    };
  }
}