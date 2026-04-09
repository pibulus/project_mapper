import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { guardRequest } from "$lib/server/apiGuard";
import { getAIService } from "$lib/server/geminiService";

export const POST: RequestHandler = async (event) => {
  try {
    const guardResponse = guardRequest(event);
    if (guardResponse) {
      return guardResponse;
    }

    const { request } = event;
    const body = await request.json();
    const transcript = body?.transcript;

    if (!transcript || typeof transcript !== "string") {
      return json(
        { error: "Transcript is required to generate a title" },
        { status: 400 },
      );
    }

    const aiService = getAIService();
    const title = await aiService.generateTitle(transcript);
    return json({ title });
  } catch (error: any) {
    console.error("[API /title] Error:", error);
    let message = "Failed to generate title. Please try again.";
    const detail = error?.message?.toLowerCase() || "";
    if (detail.includes("api key")) {
      message = "Server configuration error: Gemini API key not set";
    } else if (detail.includes("quota")) {
      message = "API quota exceeded. Please try again later.";
    } else if (detail.includes("origin")) {
      message = "This request is coming from an unexpected origin.";
    }
    return json({ error: message }, { status: error?.status || 500 });
  }
};
