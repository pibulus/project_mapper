import type { Node } from "$lib/core/types";

export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitTextForTopic(
  text: string,
  topic?: Node | null,
): Array<{ text: string; match: boolean }> {
  if (!topic?.label || !text) return [{ text, match: false }];

  const pattern = new RegExp(`(${escapeRegExp(topic.label)})`, "gi");
  return text
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      match: part.toLowerCase() === topic.label.toLowerCase(),
    }));
}

export function textMatchesTopic(text: string, topic?: Node | null): boolean {
  if (!topic?.label || !text) return false;
  return text.toLowerCase().includes(topic.label.toLowerCase());
}
