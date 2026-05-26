/**
 * PartyKit Server - Project Collaboration Room
 *
 * Handles real-time multiplayer features:
 * - User presence (who's viewing the project)
 * - Action item updates (when someone checks off an item)
 * - Live transcription updates (when new audio is added)
 * - Cursor positions (optional, for future collaboration features)
 */

import type * as Party from "partykit/server";

interface ProjectMessage {
  type: string;
  data: any;
  userId?: string;
  timestamp?: number;
}

const SERVER_UPDATE_TYPES = new Set([
  "transcript",
  "title",
  "conversation",
  "topics",
  "action-items",
  "summary",
  "status-updates",
  "analysis-warning",
]);

export default class ProjectRoom implements Party.Server {
  constructor(readonly room: Party.Room) {}

  private connectionCount() {
    return [...this.room.getConnections()].length;
  }

  private updateToken() {
    return String(this.room.env.PARTYKIT_UPDATE_TOKEN || "").trim();
  }

  private isAuthorizedRequest(req: Party.Request) {
    const token = this.updateToken();
    if (!token) return true;

    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const headerToken = req.headers.get("x-partykit-token");
    return (bearer || headerToken || "").trim() === token;
  }

  private broadcastPresenceCount() {
    this.room.broadcast(
      JSON.stringify({
        type: "presence_count",
        data: { count: this.connectionCount() },
        timestamp: Date.now(),
      }),
    );
  }

  /**
   * When a user connects to the project room
   */
  onConnect(conn: Party.Connection, _ctx: Party.ConnectionContext) {
    const userId = conn.id;

    // Broadcast presence update to all connected users
    this.room.broadcast(
      JSON.stringify({
        type: "user_joined",
        userId,
        data: { count: this.connectionCount() },
        timestamp: Date.now(),
      }),
      [conn.id], // Exclude the connecting user from this broadcast
    );

    this.broadcastPresenceCount();
  }

  /**
   * Handle HTTP requests to the room
   * Used by the backend to post analysis updates.
   */
  async onRequest(req: Party.Request) {
    if (req.method === "POST") {
      if (!this.isAuthorizedRequest(req)) {
        return new Response("Unauthorized", { status: 401 });
      }

      try {
        const update = await req.json();
        if (
          !update ||
          typeof update.type !== "string" ||
          !SERVER_UPDATE_TYPES.has(update.type)
        ) {
          return new Response("Invalid update type", { status: 400 });
        }

        // Broadcast the update to all connected clients
        this.room.broadcast(JSON.stringify(update));

        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("[PartyKit] Error processing POST request:", error);
        return new Response("Bad Request", { status: 400 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }

  /**
   * When a user sends a message
   */
  onMessage(message: string, sender: Party.Connection) {
    try {
      const msg: ProjectMessage = JSON.parse(message);
      if (!msg || typeof msg.type !== "string") return;

      // Broadcast to all other users
      this.room.broadcast(message, [sender.id]);
    } catch (error) {
      console.error("[PartyKit] Error parsing message:", error);
    }
  }

  /**
   * When a user disconnects
   */
  onClose(conn: Party.Connection) {
    const userId = conn.id;

    // Broadcast user left event
    this.room.broadcast(
      JSON.stringify({
        type: "user_left",
        userId,
        data: { count: this.connectionCount() },
        timestamp: Date.now(),
      }),
    );
    this.broadcastPresenceCount();
  }
}

ProjectRoom satisfies Party.Worker;
