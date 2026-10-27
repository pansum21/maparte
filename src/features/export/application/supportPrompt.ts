export type SupportPromptVariant = "follow";

export interface SupportPromptState {
  posterNumber: number;
  variant: SupportPromptVariant;
}

export const SUPPORT_PROMPT_EVENT = "maparte:support-prompt";
