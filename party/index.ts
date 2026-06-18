/**
 * PartyKit Server - Project Collaboration Room with Durable Storage
 *
 * Handles real-time multiplayer features and edge persistence:
 * - Load/Save project state on the Cloudflare Durable Object edge
 * - User presence and connection tracking
 * - Real-time state replication for typing, speaker rename, action items
 * - Transient mouse hovers and selections
 */

import type * as Party from "partykit/server";

interface ProjectMessage {
  type: string;
  data: any;
  userId?: string;
  timestamp?: number;
}

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
  async onConnect(conn: Party.Connection, _ctx: Party.ConnectionContext) {
    const userId = conn.id;

    // Load current project snapshot from Cloudflare Durable Object storage
    const projectData = await this.room.storage.get<any>("projectData");

    // Sync the current project snapshot to the newly connected user
    conn.send(
      JSON.stringify({
        type: "sync",
        data: projectData || null,
        timestamp: Date.now(),
      }),
    );

    // Broadcast user joined event to other users
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
   * - GET: Fetch current project state from durable storage
   * - POST: Save/Merge project state update from backend endpoints
   */
  async onRequest(req: Party.Request) {
    if (req.method === "GET") {
      const projectData = await this.room.storage.get<any>("projectData");
      if (!projectData) {
        return new Response("Project not found", { status: 404 });
      }
      return new Response(JSON.stringify(projectData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      if (!this.isAuthorizedRequest(req)) {
        return new Response("Unauthorized", { status: 401 });
      }

      try {
        const update = await req.json();
        if (!update || typeof update.type !== "string") {
          return new Response("Invalid update format", { status: 400 });
        }

        // Get current project state or create a fresh default template
        let projectData = await this.room.storage.get<any>("projectData");
        if (!projectData) {
          projectData = {
            id: this.room.id,
            title: "Untitled Project",
            summary: "",
            transcript: "",
            actionItems: [],
            topics: [],
            edges: [],
            exportDrafts: [],
            syncEnabled: true,
            isPublic: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }

        // Merge backend update payload depending on type
        switch (update.type) {
          case "append-result": {
            const result = update.data?.result;
            if (result) {
              projectData.transcript =
                result.transcript?.text ?? projectData.transcript;
              projectData.summary = result.summary ?? projectData.summary;
              projectData.actionItems =
                result.actionItems ?? projectData.actionItems;
              projectData.topics = result.topics?.nodes ?? projectData.topics;
              projectData.edges = result.topics?.edges ?? projectData.edges;
              projectData.lastAnalysisWarnings = result.warnings ?? [];
            }
            break;
          }
          case "transcript":
            if (update.data && typeof update.data.text === "string") {
              projectData.transcript = update.data.text;
            } else if (typeof update.data === "string") {
              projectData.transcript = update.data;
            }
            break;
          case "title":
            projectData.title = String(update.data);
            break;
          case "conversation":
            projectData = { ...projectData, ...update.data };
            break;
          case "topics":
            projectData.topics = update.data.nodes || [];
            projectData.edges = update.data.edges || [];
            break;
          case "action-items":
            projectData.actionItems = update.data || [];
            break;
          case "summary":
            projectData.summary = update.data || "";
            break;
          case "status-updates": {
            const statusUpdates = update.data || [];
            projectData.actionItems = (projectData.actionItems || []).map(
              (item: any) => {
                const match = statusUpdates.find((u: any) => u.id === item.id);
                if (match) {
                  return {
                    ...item,
                    status: match.status,
                    ai_checked: true,
                    checked_reason: match.reason,
                    updated_at: new Date().toISOString(),
                  };
                }
                return item;
              },
            );
            break;
          }
        }

        projectData.updatedAt = new Date().toISOString();

        // Write the merged state back to storage
        await this.room.storage.put("projectData", projectData);

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
  async onMessage(message: string, sender: Party.Connection) {
    try {
      const msg: ProjectMessage = JSON.parse(message);
      if (!msg || typeof msg.type !== "string") return;

      // If it's a client editing/updating the state locally
      if (msg.type === "project-update") {
        let projectData = await this.room.storage.get<any>("projectData");
        if (!projectData) {
          projectData = {
            id: this.room.id,
            title: "Untitled Project",
            summary: "",
            transcript: "",
            actionItems: [],
            topics: [],
            edges: [],
            exportDrafts: [],
            syncEnabled: true,
            isPublic: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }

        projectData = {
          ...projectData,
          ...msg.data,
          updatedAt: new Date().toISOString(),
        };

        // Persist to Durable Object Storage
        await this.room.storage.put("projectData", projectData);

        // Broadcast update to all other collaborators in the room
        this.room.broadcast(message, [sender.id]);
        return;
      }

      // Broadcast mouse hovers, selections, status updates, or other transient events
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
