export interface PromptItem {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly group: string;
  readonly tags: readonly string[];
}
