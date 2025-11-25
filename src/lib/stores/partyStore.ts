/**
 * PartyKit Store - Real-time Collaboration
 *
 * Manages WebSocket connection to PartyKit room for multiplayer features
 */

import { writable, derived } from "svelte/store";
import { browser } from "$app/environment";
import { env } from "$env/dynamic/public";
import PartySocket from "partysocket";

const PUBLIC_PARTYKIT_HOST = env.PUBLIC_PARTYKIT_HOST || "";
import { updateProject } from "$lib/stores/projectStore";
import type {
  Conversation,
  Transcript,
  Node,
  Edge,
  ActionItem,
  ActionItemStatusUpdate,
} from "$lib/core/types";

interface PresenceInfo {
  count: number;
  users: Set<string>;
}

interface PartyMessage {
  type: string;
  userId?: string;
  timestamp: number;
  data?: any;
}

/**
 * Create a PartyKit connection for a project
 */
export function createProjectParty(projectId: string) {
  const connected = writable(false);
  const presence = writable<PresenceInfo>({ count: 0, users: new Set() });

  // Stores for our real-time analysis data
  const conversation = writable<Partial<Conversation>>({});
  const transcript = writable<Partial<Transcript>>({});
  const nodes = writable<Node[]>([]);
  const edges = writable<Edge[]>([]);
  const actionItems = writable<ActionItem[]>([]);
  const summary = writable<string>("");

  let socket: PartySocket | null = null;

  function connect() {
    if (!browser || !PUBLIC_PARTYKIT_HOST) return;
    if (socket) return;

    console.log(`[PartyKit] Connecting to project: ${projectId}`);
    socket = new PartySocket({
      host: PUBLIC_PARTYKIT_HOST,
      room: projectId,
    });

    socket.addEventListener("open", () => {
      console.log("[PartyKit] Connected");
      connected.set(true);
    });

    socket.addEventListener("message", (event) => {
      try {
        const msg: PartyMessage = JSON.parse(event.data);
        console.log("[PartyKit] Message received:", msg.type);

        switch (msg.type) {
          // Presence
          case "presence_count":
            presence.update((p) => ({ ...p, count: msg.data?.count || 0 }));
            break;
          case "user_joined":
            presence.update((p) => {
              const users = new Set(p.users);
              if (msg.userId) users.add(msg.userId);
              return { count: users.size, users };
            });
            break;
          case "user_left":
            presence.update((p) => {
              const users = new Set(p.users);
              if (msg.userId) users.delete(msg.userId);
              return { count: users.size, users };
            });
            break;

          // Analysis updates
          case "transcript":
            transcript.set(msg.data);
            updateProject({ transcript: msg.data.text });
            break;
          case "title":
            conversation.update((c) => ({ ...c, title: msg.data }));
            updateProject({ title: msg.data });
            break;
          case "conversation":
            conversation.set(msg.data);
            updateProject(msg.data);
            break;
          case "topics":
            nodes.set(msg.data.nodes || []);
            edges.set(msg.data.edges || []);
            updateProject({ topics: msg.data.nodes, edges: msg.data.edges });
            break;
          case "action-items":
            actionItems.set(msg.data || []);
            updateProject({ actionItems: msg.data });
            break;
          case "summary":
            summary.set(msg.data || "");
            updateProject({ summary: msg.data });
            break;
          case "status-updates":
            actionItems.update((items) => {
              const newItems = [...items];
              (msg.data as ActionItemStatusUpdate[]).forEach((update) => {
                const item = newItems.find((i) => i.id === update.id);
                if (item) {
                  item.status = update.status;
                }
              });
              updateProject({ actionItems: newItems });
              return newItems;
            });
            break;
        }
      } catch (error) {
        console.error("[PartyKit] Error parsing message:", error);
      }
    });

    socket.addEventListener("close", () => {
      console.log("[PartyKit] Disconnected");
      connected.set(false);
      socket = null;
    });

    socket.addEventListener("error", (error) => {
      console.error("[PartyKit] Error:", error);
    });
  }

  function disconnect() {
    if (socket) {
      console.log("[PartyKit] Disconnecting");
      socket.close();
    }
  }

  function send(type: string, data?: any) {
    if (!socket) return;
    socket.send(
      JSON.stringify({ type, data, userId: socket.id, timestamp: Date.now() }),
    );
  }

  if (browser) {
    connect();
  }

  return {
    connected: { subscribe: connected.subscribe },
    presence: { subscribe: presence.subscribe },
    conversation: { subscribe: conversation.subscribe },
    transcript: { subscribe: transcript.subscribe },
    nodes: { subscribe: nodes.subscribe },
    edges: { subscribe: edges.subscribe },
    actionItems: { subscribe: actionItems.subscribe },
    summary: { subscribe: summary.subscribe },
    send,
    connect,
    disconnect,
  };
}
