import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";

interface EmojiMarkerPickerProps {
  onSelect: (emoji: string, unified: string) => void;
}

export default function EmojiMarkerPicker({ onSelect }: EmojiMarkerPickerProps) {
  return (
    <div className="marker-emoji-picker-wrap">
      <EmojiPicker
        className="maparte-emoji-picker"
        theme={Theme.DARK}
        emojiStyle={EmojiStyle.NATIVE}
        width="100%"
        height={320}
        lazyLoadEmojis
        previewConfig={{ showPreview: false }}
        searchPlaceHolder="Search emojis and flags"
        onEmojiClick={({ emoji, unified }) => onSelect(emoji, unified)}
      />
    </div>
  );
}
