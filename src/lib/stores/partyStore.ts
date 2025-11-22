/**
 * PartyKit Store - Real-time Collaboration
 *
 * Manages WebSocket connection to PartyKit room for multiplayer features
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { PUBLIC_PARTYKIT_HOST } from '$env/static/public';
import PartySocket from 'partysocket';

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
	const messages = writable<PartyMessage[]>([]);

	let socket: PartySocket | null = null;

	/**
	 * Connect to project room
	 */
	function connect() {
		if (!browser || !PUBLIC_PARTYKIT_HOST) {
			console.warn('[PartyKit] Not connecting: browser or host not available');
			return;
		}

		if (socket) {
			console.log('[PartyKit] Already connected');
			return;
		}

		console.log(`[PartyKit] Connecting to project: ${projectId}`);

		socket = new PartySocket({
			host: PUBLIC_PARTYKIT_HOST,
			room: projectId
		});

		socket.addEventListener('open', () => {
			console.log('[PartyKit] Connected');
			connected.set(true);
		});

		socket.addEventListener('message', (event) => {
			try {
				const msg: PartyMessage = JSON.parse(event.data);
				console.log('[PartyKit] Message received:', msg.type);

				// Update presence
				if (msg.type === 'presence_count') {
					presence.update((p) => ({ ...p, count: msg.data?.count || 0 }));
				} else if (msg.type === 'user_joined') {
					presence.update((p) => {
						const users = new Set(p.users);
						if (msg.userId) users.add(msg.userId);
						return { count: users.size, users };
					});
				} else if (msg.type === 'user_left') {
					presence.update((p) => {
						const users = new Set(p.users);
						if (msg.userId) users.delete(msg.userId);
						return { count: users.size, users };
					});
				}

				// Store message
				messages.update((m) => [...m, msg]);
			} catch (error) {
				console.error('[PartyKit] Error parsing message:', error);
			}
		});

		socket.addEventListener('close', () => {
			console.log('[PartyKit] Disconnected');
			connected.set(false);
			socket = null;
		});

		socket.addEventListener('error', (error) => {
			console.error('[PartyKit] Error:', error);
		});
	}

	/**
	 * Disconnect from project room
	 */
	function disconnect() {
		if (socket) {
			console.log('[PartyKit] Disconnecting');
			socket.close();
			socket = null;
			connected.set(false);
		}
	}

	/**
	 * Send a message to the room
	 */
	function send(type: string, data?: any) {
		if (!socket) {
			console.warn('[PartyKit] Cannot send: not connected');
			return;
		}

		const message: PartyMessage = {
			type,
			data,
			userId: socket.id,
			timestamp: Date.now()
		};

		socket.send(JSON.stringify(message));
	}

	// Auto-connect when created
	if (browser) {
		connect();
	}

	return {
		connected: { subscribe: connected.subscribe },
		presence: { subscribe: presence.subscribe },
		messages: { subscribe: messages.subscribe },
		send,
		connect,
		disconnect
	};
}
