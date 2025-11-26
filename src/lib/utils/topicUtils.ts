import type { Node } from '$lib/core/types';

export function escapeRegExp(input: string): string {
	return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightTextForTopic(text: string, topic?: Node | null): string {
	if (!topic?.label || !text) return text;
	const pattern = new RegExp(`(${escapeRegExp(topic.label)})`, 'gi');
	return text.replace(pattern, '<span class="topic-highlight">$1</span>');
}

export function textMatchesTopic(text: string, topic?: Node | null): boolean {
	if (!topic?.label || !text) return false;
	return text.toLowerCase().includes(topic.label.toLowerCase());
}
