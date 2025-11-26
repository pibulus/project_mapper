import { writable } from 'svelte/store';
import type { Node } from '$lib/core/types';

type RemoteMap = Record<string, Node | null>;

const createTopicSelectionStore = () => {
	const hoveredTopic = writable<Node | null>(null);
	const selectedTopic = writable<Node | null>(null);
	const remoteHovers = writable<RemoteMap>({});
	const remoteSelections = writable<RemoteMap>({});

	function setRemoteState(store: typeof remoteHovers, userId: string, topic: Node | null) {
		store.update((map) => {
			const next = { ...map };
			if (!topic) {
				delete next[userId];
			} else {
				next[userId] = topic;
			}
			return next;
		});
	}

	return {
		hoveredTopic,
		selectedTopic,
		remoteHovers,
		remoteSelections,
		setHoveredTopic: (topic: Node | null) => hoveredTopic.set(topic),
		setSelectedTopic: (topic: Node | null) => selectedTopic.set(topic),
		clearHover: () => hoveredTopic.set(null),
		clearSelection: () => selectedTopic.set(null),
		setRemoteHover: (userId: string, topic: Node | null) =>
			setRemoteState(remoteHovers, userId, topic),
		setRemoteSelection: (userId: string, topic: Node | null) =>
			setRemoteState(remoteSelections, userId, topic),
		clearRemoteUser: (userId: string) => {
			setRemoteState(remoteHovers, userId, null);
			setRemoteState(remoteSelections, userId, null);
		}
	};
};

export const topicSelection = createTopicSelectionStore();
