import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getAIService } from "$lib/server/geminiService";
import {
  getAllowedAudioDescription,
  getMaxUploadBytes,
  guardRequest,
  isAllowedAudioUpload,
} from "$lib/server/apiGuard";
import { transcribeAudio } from "$lib/server/geminiService";
import { processText } from "$lib/core/orchestration/conversation-flow";
import { postUpdateToParty } from "$lib/server/partyUpdates";

const MAX_UPLOAD_BYTES = getMaxUploadBytes();

export const POST: RequestHandler = async (event) => {
  try {
    const guardResponse = guardRequest(event);
    if (guardResponse) {
      return guardResponse;
    }

    const { request } = event;
    const contentType = request.headers.get("content-type") || "";
    let text = "";
    let conversationId = "";
    let speakers: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const audioFile = formData.get("audio");
      conversationId = formData.get("conversationId")?.toString() || "";

      if (!audioFile || typeof audioFile === "string") {
        return json({ error: "No audio file provided" }, { status: 400 });
      }

      if (audioFile.size > MAX_UPLOAD_BYTES) {
        const mb = (MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0);
        return json(
          { error: `File too large. Maximum size is ${mb}MB` },
          { status: 413 },
        );
      }

      if (!isAllowedAudioUpload(audioFile)) {
        return json(
          {
            error: `Unsupported audio type. Allowed types: ${getAllowedAudioDescription()}`,
          },
          { status: 415 },
        );
      }

      const transcript = await transcribeAudio(audioFile);
      text = transcript.text;
      speakers = transcript.speakers;
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      text = body.text;
      conversationId = body.conversationId || "";
    } else {
      return json({ error: "Invalid content type" }, { status: 400 });
    }

    if (!text || typeof text !== "string") {
      return json({ error: "No text provided" }, { status: 400 });
    }

    const aiService = getAIService();
    const id = conversationId || crypto.randomUUID();

    // Don't await this, let it run in the background
    processText(aiService, text, id, speakers, [], [], (type, data) => {
      postUpdateToParty(id, { type, data, timestamp: Date.now() });
    });

    return json({ id }, { status: 202 });
  } catch (error: any) {
    console.error("[API /process-stream] ❌ Error:", error);
    return json(
      { error: "Something went wrong processing the stream request." },
      { status: error?.status || 500 },
    );
  }
};
