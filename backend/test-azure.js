import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

async function testAzure() {
  try {
    const url = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`;

    console.log("Testing Azure URL:", url);

    const response = await axios.post(
      url,
      {
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 20
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_KEY
        }
      }
    );

    console.log("SUCCESS:", response.data);

  } catch (err) {
    console.error("ERROR:");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

testAzure();
