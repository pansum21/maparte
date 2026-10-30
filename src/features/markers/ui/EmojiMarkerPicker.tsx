import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { getEmojiAssetUrl } from "@/features/markers/infrastructure/fluentEmojiAssets";

interface EmojiMarkerPickerProps {
  onSelect: (emoji: string, unified: string) => void;
}

export default function EmojiMarkerPicker({ onSelect }: EmojiMarkerPickerProps) {
  return (
    <div className="marker-emoji-picker-wrap">
      <EmojiPicker
        className="maparte-emoji-picker"
        theme={Theme.DARK}
        emojiStyle={EmojiStyle.APPLE}
        getEmojiUrl={getEmojiAssetUrl}
        width="100%"
        height="100%"
        lazyLoadEmojis
        autoFocusSearch={false}
        skinTonesDisabled
        previewConfig={{ showPreview: false }}
        searchPlaceHolder="Search emojis and flags"
        onEmojiClick={({ emoji, unified }) => onSelect(emoji, unified)}
      />
    </div>
  );
}
