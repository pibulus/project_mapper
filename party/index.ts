/**
 * PartyKit Server - Project Collaboration Room
 *
 * Handles real-time multiplayer features:
 * - User presence (who's viewing the project)
 * - Action item updates (when someone checks off an item)
 * - Live transcription updates (when new audio is added)
 * - Cursor positions (optional, for future collaboration features)
 */

import type * as Party from 'partykit/server';

interface ProjectMessage {
	type: 'presence' | 'action_item_update' | 'transcript_update' | 'cursor';
	data: any;
	userId: string;
	timestamp: number;
}

export default class ProjectRoom implements Party.Server {
	constructor(readonly room: Party.Room) {}

	/**
	 * When a user connects to the project room
	 */
	onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
		const userId = conn.id;
		console.log(`[PartyKit] User ${userId} joined project ${this.room.id}`);

		// Broadcast presence update to all connected users
		this.room.broadcast(
			JSON.stringify({
				type: 'user_joined',
				userId,
				timestamp: Date.now()
			}),
			[conn.id] // Exclude the connecting user from this broadcast
		);

		// Send current presence count to the new user
		const connections = [...this.room.getConnections()];
		conn.send(
			JSON.stringify({
				type: 'presence_count',
				count: connections.length,
				timestamp: Date.now()
			})
		);
	}

	/**
	 * When a user sends a message
	 */
	onMessage(message: string, sender: Party.Connection) {
		try {
			const msg: ProjectMessage = JSON.parse(message);

			console.log(`[PartyKit] Message from ${sender.id}:`, msg.type);

			// Broadcast to all other users
			this.room.broadcast(message, [sender.id]);
		} catch (error) {
			console.error('[PartyKit] Error parsing message:', error);
		}
	}

	/**
	 * When a user disconnects
	 */
	onClose(conn: Party.Connection) {
		const userId = conn.id;
		console.log(`[PartyKit] User ${userId} left project ${this.room.id}`);

		// Broadcast user left event
		this.room.broadcast(
			JSON.stringify({
				type: 'user_left',
				userId,
				timestamp: Date.now()
			})
		);
	}
}

ProjectRoom satisfies Party.Worker;
