import emojiMap from '@/lib/emoji-map.json';

interface EmojiProps {
  emoji: string;
  size?: number;
  className?: string;
}

const MAP: Record<string, string> = emojiMap;

/**
 * Dibuja un emoji con el set Twemoji (plano, a color) en vez de depender de
 * la fuente de emoji del sistema operativo. Si el emoji no está en el mapa
 * pre-descargado (public/emoji/, generado por scripts/fetch-emoji.js) cae al
 * caracter nativo para no romper la UI.
 */
export function Emoji({ emoji, size = 20, className }: EmojiProps) {
  const codepoint = MAP[emoji];
  if (!codepoint) {
    return (
      <span className={className} style={{ fontSize: size, lineHeight: 1 }}>
        {emoji}
      </span>
    );
  }
  return (
    <img
      src={`/emoji/${codepoint}.svg`}
      alt={emoji}
      width={size}
      height={size}
      draggable={false}
      className={className}
      style={{ width: size, height: size, display: 'block' }}
    />
  );
}
