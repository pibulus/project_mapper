/**
 * POST /api/export
 *
 * Transform conversation transcript to different formats using AI
 *
 * Supported formats:
 * - blog: Blog post with sections and flow
 * - manual: Technical manual with steps
 * - haiku: Poetic 3-line summary
 * - summary: Executive summary
 * - custom: Custom format with provided prompt
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getAIService } from "$lib/server/geminiService";
import { EXPORT_FORMATS } from "$lib/core/export/formats";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { transcript, format } = body;

    if (!transcript || typeof transcript !== "string") {
      return json({ error: "Transcript required" }, { status: 400 });
    }

    if (!format || typeof format !== "string") {
      return json({ error: "Format required" }, { status: 400 });
    }

    // Get format prompt from core
    const formatPrompt = EXPORT_FORMATS[format as keyof typeof EXPORT_FORMATS];

    if (!formatPrompt) {
      return json({ error: `Unknown format: ${format}` }, { status: 400 });
    }

    console.log(`[API /export] Generating ${format} export`);

    const aiService = getAIService();

    // Use core AI service to generate markdown
    const markdown = await aiService.generateMarkdown(formatPrompt, transcript);

    console.log(`[API /export] ✅ Generated ${format} export`);

    return json({ markdown });
  } catch (error: any) {
    console.error("[API /export] ❌ Error:", error);

    const message = error?.message?.toLowerCase() || "";
    let friendlyMessage = "Failed to generate export. Please try again.";

    if (message.includes("api key")) {
      friendlyMessage = "Server configuration error: Gemini API key not set";
    } else if (message.includes("quota")) {
      friendlyMessage = "API quota exceeded. Please try again later.";
    }

    return json({ error: friendlyMessage }, { status: 500 });
  }
};
