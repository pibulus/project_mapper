/**
 * PartyKit Store - Real-time Collaboration
 *
 * Manages WebSocket connection to PartyKit room for multiplayer features
 */

import { get, writable } from "svelte/store";
import { browser } from "$app/environment";
import { env } from "$env/dynamic/public";
import PartySocket from "partysocket";

const PUBLIC_PARTYKIT_HOST = env.PUBLIC_PARTYKIT_HOST || "";
import { currentProject, updateProject } from "$lib/stores/projectStore";
import {
  mergeAppendUpdates,
  type AppendAudioResponse,
} from "$lib/client/appendAudio";
import type {
  ConversationData,
  Conversation,
  Transcript,
  Node,
  Edge,
  ActionItem,
  ActionItemStatusUpdate,
} from "$lib/core/types";
import { topicSelection } from "$lib/stores/topicSelection";

interface PresenceInfo {
  count: number;
  users: Set<string>;
}

interface PartyMessage {
  type: string;
  userId?: string;
  timestamp: number;
  count?: number;
  data?: any;
}

interface AppendResultData {
  baseProject: Pick<
    ConversationData,
    "id" | "transcript" | "summary" | "actionItems" | "topics" | "edges"
  >;
  result: AppendAudioResponse;
}

function getPresenceCount(msg: PartyMessage) {
  const count = Number(msg.data?.count ?? msg.count ?? 0);
  return Number.isFinite(count) ? count : 0;
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

    socket = new PartySocket({
      host: PUBLIC_PARTYKIT_HOST,
      room: projectId,
    });

    socket.addEventListener("open", () => {
      connected.set(true);
    });

    socket.addEventListener("message", (event) => {
      try {
        const msg: PartyMessage = JSON.parse(event.data);

        switch (msg.type) {
          // Presence
          case "presence_count":
            presence.update((p) => ({ ...p, count: getPresenceCount(msg) }));
            break;
          case "user_joined":
            presence.update((p) => {
              const users = new Set(p.users);
              if (msg.userId) users.add(msg.userId);
              return {
                count: getPresenceCount(msg) || Math.max(p.count, users.size),
                users,
              };
            });
            break;
          case "user_left":
            presence.update((p) => {
              const users = new Set(p.users);
              if (msg.userId) users.delete(msg.userId);
              return {
                count: getPresenceCount(msg) || Math.max(0, p.count - 1),
                users,
              };
            });
            if (msg.userId) {
              topicSelection.clearRemoteUser(msg.userId);
            }
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
          case "append-result": {
            const data = msg.data as AppendResultData | undefined;
            const current = get(currentProject);
            if (
              !current ||
              current.id !== projectId ||
              data?.baseProject?.id !== projectId ||
              !data.result
            ) {
              break;
            }

            const updates = mergeAppendUpdates(
              data.baseProject,
              current,
              data.result,
            );
            const nextTopics = updates.topics ?? current.topics ?? [];
            const nextEdges = updates.edges ?? current.edges ?? [];
            const nextActionItems =
              updates.actionItems ?? current.actionItems ?? [];
            const nextSummary = updates.summary ?? current.summary ?? "";
            const nextTranscript =
              updates.transcript ?? current.transcript ?? "";

            transcript.set({ text: nextTranscript });
            nodes.set(nextTopics);
            edges.set(nextEdges);
            actionItems.set(nextActionItems);
            summary.set(nextSummary);
            updateProject({
              ...updates,
              lastAnalysisWarnings:
                data.result.warnings ?? current.lastAnalysisWarnings ?? [],
            });
            break;
          }
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
                  item.ai_checked = true;
                  item.checked_reason = update.reason;
                  item.updated_at = new Date().toISOString();
                }
              });
              updateProject({ actionItems: newItems });
              return newItems;
            });
            break;
          case "analysis-warning":
            console.warn("[PartyKit] Analysis warning:", msg.data);
            break;
          case "topic-hover":
            if (msg.userId) {
              topicSelection.setRemoteHover(
                msg.userId,
                msg.data?.topic ?? null,
              );
            }
            break;
          case "topic-selection":
            if (msg.userId) {
              topicSelection.setRemoteSelection(
                msg.userId,
                msg.data?.topic ?? null,
              );
            }
            break;
        }
      } catch (error) {
        console.error("[PartyKit] Error parsing message:", error);
      }
    });

    socket.addEventListener("close", () => {
      connected.set(false);
      socket = null;
    });

    socket.addEventListener("error", (error) => {
      console.error("[PartyKit] Error:", error);
    });
  }

  function disconnect() {
    if (socket) {
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
