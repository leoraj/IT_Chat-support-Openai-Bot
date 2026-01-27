import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,

  azureOpenAI: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
    key: process.env.AZURE_OPENAI_KEY
  },

  azureSearch: {
    endpoint: process.env.AZURE_SEARCH_ENDPOINT,
    index: process.env.AZURE_SEARCH_INDEX,
    apiVersion: process.env.AZURE_SEARCH_API_VERSION,
    key: process.env.AZURE_SEARCH_KEY
  },

ticketing: {
  system: process.env.TICKETING_SYSTEM,
  desk365BaseUrl: process.env.DESK365_BASE_URL,
  desk365ApiKey: process.env.DESK365_API_KEY
}
};

