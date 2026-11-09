import type { PromptItem } from './model';

export type { PromptItem } from './model';

export type PromptGroup = readonly [string, readonly PromptItem[]];

export function filterPrompts(
  prompts: readonly PromptItem[],
  query: string,
): readonly PromptItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return prompts;

  return prompts.filter((item) =>
    [item.title, item.content, item.group, item.tags.join(' ')]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

export function groupPrompts(prompts: readonly PromptItem[]): readonly PromptGroup[] {
  const groups = new Map<string, PromptItem[]>();
  for (const item of prompts) {
    const group = groups.get(item.group) ?? [];
    group.push(item);
    groups.set(item.group, group);
  }
  return Array.from(groups.entries());
}

export function resolveSelectedPrompt(
  prompts: readonly PromptItem[],
  selectedId: string,
): PromptItem | null {
  return prompts.find((item) => item.id === selectedId) ?? prompts[0] ?? null;
}
