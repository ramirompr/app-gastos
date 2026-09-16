/**
 * Genera los íconos PWA (public/icon-192x192.png, icon-512x512.png) como un
 * ícono vectorial simple (moneda) usando ImageResponse de Next (satori), sin
 * depender de assets externos ni de un editor de imágenes.
 */
const fs = require('fs');
const path = require('path');

const ACCENT = '#7c3aed';
const LIGHT = '#f8fafc';

function coinIcon(size) {
  const outerD = size * 0.48;
  const innerD = outerD * 0.56;

  return {
    type: 'div',
    props: {
      style: {
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: ACCENT,
        borderRadius: size * 0.22,
      },
      children: {
        type: 'div',
        props: {
          style: {
            width: outerD,
            height: outerD,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: LIGHT,
            borderRadius: outerD,
          },
          children: {
            type: 'div',
            props: {
              style: {
                width: innerD,
                height: innerD,
                display: 'flex',
                background: ACCENT,
                borderRadius: innerD,
              },
            },
          },
        },
      },
    },
  };
}

(async () => {
  const { ImageResponse } = await import('next/dist/compiled/@vercel/og/index.node.js');
  const sizes = [192, 512];

  for (const size of sizes) {
    const res = new ImageResponse(coinIcon(size), { width: size, height: size });
    const buf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(__dirname, '..', 'public', `icon-${size}x${size}.png`);
    fs.writeFileSync(outPath, buf);
    console.log(`wrote ${outPath} (${buf.length} bytes)`);
  }
})();
