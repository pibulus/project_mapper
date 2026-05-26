import { env } from "$env/dynamic/private";

/**
 * Helper for posting analysis updates back to PartyKit rooms.
 * No-ops when no PartyKit host is configured.
 */
const PARTYKIT_HOST =
  env.PARTYKIT_SERVER_HOST ||
  env.PARTYKIT_HOST ||
  env.PUBLIC_PARTYKIT_HOST ||
  "";
const PARTYKIT_UPDATE_TOKEN = env.PARTYKIT_UPDATE_TOKEN?.trim() || "";

export async function postUpdateToParty(
  roomId: string,
  update: { type: string; data: unknown; timestamp?: number },
) {
  if (!roomId) return;
  if (!PARTYKIT_HOST) return;

  const url = `${PARTYKIT_HOST.replace(/\/$/, "")}/parties/project/${roomId}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(PARTYKIT_UPDATE_TOKEN
          ? { "x-partykit-token": PARTYKIT_UPDATE_TOKEN }
          : {}),
      },
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
