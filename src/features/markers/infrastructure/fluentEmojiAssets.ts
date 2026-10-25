import assetPaths from "./fluentEmojiAssetPaths.json";

export const FLUENT_EMOJI_COMMIT = "1ffb34c752ecf5d402f04cfb4b392c77f57c54bc";
const FLUENT_EMOJI_CDN = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@1ffb34c752ecf5d402f04cfb4b392c77f57c54bc/";
const APPLE_EMOJI_CDN = "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/";

export function getFluentEmojiAssetUrl(unified: string): string | undefined {
  const path = (assetPaths as Record<string, string>)[unified.toLowerCase()];
  return path ? FLUENT_EMOJI_CDN + path.split("/").map(encodeURIComponent).join("/") : undefined;
}

export function getEmojiAssetUrl(unified: string): string {
  return getFluentEmojiAssetUrl(unified) ?? `${APPLE_EMOJI_CDN}${unified.toLowerCase()}.png`;
}
