const fs = require('fs');
const path = require('path');
const https = require('https');
const twemoji = require('twemoji');

const EMOJIS = [
  // EmojiPicker groups
  '🍕', '🍔', '🌮', '🍣', '☕', '🥤', '🍺', '🍷', '🍎', '🥗', '🍜', '🧁',
  '🚗', '🚕', '🚌', '🚂', '✈️', '🚴', '⛽', '🅿️', '🛵', '🚁',
  '🎮', '🎬', '🎵', '🎤', '⚽', '🏋️', '📚', '🎨', '🎭', '🎲',
  '🏠', '🛋️', '🔧', '🧹', '⚡', '💡', '🐕', '🌱', '🔥', '🚿',
  '🛍️', '👕', '👞', '💄', '📱', '💍', '⌚', '🧩', '📖', '🎒',
  '💊', '🦷', '🏥', '❤️', '💪', '🧠', '🩺', '🧘',
  '💰', '🏦', '📈', '💳', '💸', '📋', '💵', '👛',
  '🎁', '🎉', '💼', '🎓', '📺', '❓', '⭐', '👥', '🏖️', '🧳',
  // default used before the picker existed
  '📦',
];

const unique = [...new Set(EMOJIS)];
const outDir = path.join(__dirname, '..', 'public', 'emoji');
fs.mkdirSync(outDir, { recursive: true });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`${res.statusCode} for ${url}`));
          return;
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', reject);
  });
}

(async () => {
  const map = {};
  for (const emoji of unique) {
    const codepoint = twemoji.convert.toCodePoint(emoji);
    const withoutFe0f = codepoint.replace(/-fe0f/g, '');
    const dest = path.join(outDir, `${codepoint}.svg`);

    if (fs.existsSync(dest)) {
      map[emoji] = codepoint;
      continue;
    }

    const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoint}.svg`;
    try {
      await download(url, dest);
      map[emoji] = codepoint;
      console.log('OK  ', emoji, codepoint);
      continue;
    } catch {
      // fall through to the no-FE0F filename below
    }

    if (withoutFe0f !== codepoint) {
      const destAlt = path.join(outDir, `${withoutFe0f}.svg`);
      const urlAlt = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${withoutFe0f}.svg`;
      try {
        await download(urlAlt, destAlt);
        map[emoji] = withoutFe0f;
        console.log('OK* ', emoji, withoutFe0f, '(sin fe0f)');
        continue;
      } catch (err) {
        console.error('FAIL', emoji, codepoint, err.message);
      }
    }
  }
  fs.writeFileSync(
    path.join(__dirname, '..', 'lib', 'emoji-map.json'),
    JSON.stringify(map, null, 2)
  );
  console.log('Done. Wrote lib/emoji-map.json with', Object.keys(map).length, 'entries.');
})();
