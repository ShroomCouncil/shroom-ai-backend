// index.js
import { serve } from "bun";
import dotenv from "dotenv";
import { handleUserInput } from "./agents/merchants";

dotenv.config();

const PORT = process.env.PORT || 8080;

serve({
  async fetch(req) {
    const url = new URL(req.url);
    
    // Handle preflight OPTIONS requests for CORS.
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Public-Key",
        },
      });
    }
    
    if (req.method !== "POST" || url.pathname !== "/chat") {
      return new Response("Not Found", { status: 404 });
    }

    try {
      const body = await req.json();
      const { userId, npcId, message } = body;
      if (!userId || !npcId || !message) {
        return new Response(
          JSON.stringify({ error: "Missing 'userId', 'npcId', or 'message' in request body" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const response = await handleUserInput(userId, npcId, message);
      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } catch (error) {
      console.error("Error in /chat:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
  port: PORT,
});

console.log(`Server is listening on port ${PORT}`);
