import { WebSocketServer } from "ws";
import Groq from "groq-sdk/index.mjs";
import "dotenv/config";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const wss = new WebSocketServer({ port: 8080 });

console.log(" Groq WebSocket Server running on ws://localhost:8080");
console.log("🤖 Model: llama-3.1-8b-instant");

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (data) => {
    const userMessage = data.toString().trim();
    console.log(" User:", userMessage);

    try {
      const stream = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful AI chatbot. Reply briefly. Max 3 sentences.",
          },
          { role: "user", content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 120,
        stream: true,
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content;
        if (token) {
          ws.send(
            JSON.stringify({
              type: "chunk",
              content: token,
            })
          );
        }
      }

      ws.send(JSON.stringify({ type: "done" }));
    } catch (err) {
      console.error(" Groq Error:", err.message);
      ws.send(
        JSON.stringify({
          type: "error",
          content: "Groq API failed",
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});
