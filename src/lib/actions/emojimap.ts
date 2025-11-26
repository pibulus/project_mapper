import type { Action } from 'svelte/action';
import {
	forceDirectedEmojimap,
	type EmojimapHandle
} from '$lib/utils/forceDirectedEmojimap';
import type { Node, Edge } from '$lib/core/types';

export interface EmojimapActionParams {
	nodes?: Node[];
	edges?: Edge[];
	config?: Parameters<typeof forceDirectedEmojimap>[1]['config'];
}

export const emojimap: Action<HTMLElement, EmojimapActionParams> = (node, params) => {
	let handle: EmojimapHandle | null = null;

	function init() {
		if (!node || !params?.nodes?.length) return;
		handle = forceDirectedEmojimap(node, {
			nodes: params.nodes,
			edges: params.edges,
			config: params.config
		});
		if (handle) {
			node.dispatchEvent(new CustomEvent('emojimapready', { detail: handle }));
		}
	}

	init();

	return {
		update(newParams) {
			params = newParams;
			if (!handle) {
				init();
				return;
			}
			handle.update({
				nodes: newParams?.nodes,
				edges: newParams?.edges,
				config: newParams?.config
			});
		},
		destroy() {
			node.dispatchEvent(new CustomEvent('emojimapdestroyed'));
			handle?.destroy();
			handle = null;
		}
	};
};
