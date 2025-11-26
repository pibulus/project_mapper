import { env } from "$env/dynamic/private";

/**
 * Helper for posting analysis updates back to PartyKit rooms.
 * Falls back to the local dev host when no env override is provided.
 */
const PARTYKIT_HOST =
  env.PARTYKIT_SERVER_HOST ||
  env.PARTYKIT_HOST ||
  env.PUBLIC_PARTYKIT_HOST ||
  "http://127.0.0.1:1999";

export async function postUpdateToParty(
  roomId: string,
  update: { type: string; data: unknown; timestamp?: number },
) {
  if (!roomId) return;

  const url = `${PARTYKIT_HOST.replace(/\/$/, "")}/parties/project/${roomId}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...update,
        timestamp: update.timestamp ?? Date.now(),
      }),
    });

    if (!response.ok) {
      console.error(
        `[PartyKit] Failed to send update (${update.type}): ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    console.error("[PartyKit] Error sending update:", error);
  }
}
