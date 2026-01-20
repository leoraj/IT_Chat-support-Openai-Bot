import axios from "axios";
import { config } from "../config.js";
import { log } from "../utils/logger.js";

export async function searchKnowledgeBase(query) {
  const url = `${config.azureSearch.endpoint}/indexes/${config.azureSearch.index}/docs/search?api-version=${config.azureSearch.apiVersion}`;

  try {
    const response = await axios.post(
      url,
      { search: query, top: 3 },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": config.azureSearch.key
        }
      }
    );

    const docs = response.data.value || [];
    const mergedContent = docs
      .map(d => d.content || d.text || "")
      .filter(Boolean)
      .join("\n\n");

    return { docs, mergedContent };
  } catch (err) {
    log("Azure Search error", err.message);
    return { docs: [], mergedContent: "" };
  }
}