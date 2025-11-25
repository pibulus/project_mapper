import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getAIService } from "$lib/server/geminiService";
import { processText } from "$lib/core/orchestration/conversation-flow";
import type { PartyKitRoom } from "$lib/types";

const PARTYKIT_HOST = "http://127.0.0.1:1999";

async function postUpdateToParty(roomId: string, update: any) {
  const url = `${PARTYKIT_HOST}/parties/project/${roomId}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    if (!response.ok) {
      console.error(
        `[API /process-stream] Failed to send update to party: ${response.statusText}`,
      );
    }
  } catch (error) {
    console.error(
      "[API /process-stream] Error sending update to party:",
      error,
    );
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { text, conversationId } = body;

    if (!text || typeof text !== "string") {
      return json({ error: "No text provided" }, { status: 400 });
    }

    console.log(
      `[API /process-stream] Processing ${text.length} characters of text`,
    );

    const aiService = getAIService();
    const id = conversationId || crypto.randomUUID();

    // Don't await this, let it run in the background
    processText(aiService, text, id, [], [], [], (type, data) => {
      postUpdateToParty(id, { type, data, timestamp: Date.now() });
    });

    return json({ id }, { status: 202 });
  } catch (error: any) {
    console.error("[API /process-stream] ❌ Error:", error);
    return json({ error: "Something went wrong" }, { status: 500 });
  }
};
