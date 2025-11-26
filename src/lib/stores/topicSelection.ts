import { writable } from 'svelte/store';
import type { Node } from '$lib/core/types';

const createTopicSelectionStore = () => {
	const hoveredTopic = writable<Node | null>(null);
	const selectedTopic = writable<Node | null>(null);

	return {
		hoveredTopic,
		selectedTopic,
		setHoveredTopic: (topic: Node | null) => hoveredTopic.set(topic),
		setSelectedTopic: (topic: Node | null) => selectedTopic.set(topic),
		clearHover: () => hoveredTopic.set(null),
		clearSelection: () => selectedTopic.set(null)
	};
};

export const topicSelection = createTopicSelectionStore();
