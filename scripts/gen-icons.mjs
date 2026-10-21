import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Un solo disegno (arcobaleno + sole) per tutte le icone: web/PWA, app
// Android e scheda del Play Store. Rilanciare dopo aver cambiato il disegno:
// `node scripts/gen-icons.mjs`.
const CREAM = '#FFF8E7';
// Archi interi dentro il quadrato (niente tagli ai bordi), centrati in verticale.
const ART = `
  <g transform="translate(256,380)">
    ${['#9B5DE5', '#5E7CE2', '#4CC9F0', '#7BC950', '#FFD166', '#FF9A3D', '#FF5D5D']
      .map((c, i) => {
        const r = 230 - i * 28;
        return `<path d="M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0" stroke="${c}" stroke-width="22" stroke-linecap="round" fill="none"/>`;
      })
      .join('\n    ')}
  </g>
  <circle cx="122" cy="132" r="44" fill="#FFD166" stroke="#FF9A3D" stroke-width="4"/>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${CREAM}"/>${ART}
</svg>`;

/** L'icona quadrata `inner`×`inner`, centrata su una tela `size`×`size` (trasparente se `bg` manca). */
function icon(size, inner, bg) {
  const pad = Math.floor((size - inner) / 2);
  return sharp(Buffer.from(svg))
    .resize(inner, inner)
    .extend({
      top: pad,
      left: pad,
      bottom: size - inner - pad,
      right: size - inner - pad,
      background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 },
    });
}

// ——— Web / PWA ———
writeFileSync('public/favicon.svg', svg);
await icon(192, 192).png().toFile('public/icon-192.png');
await icon(512, 512).png().toFile('public/icon-512.png');
await icon(512, 384, CREAM).png().toFile('public/icon-maskable-512.png'); // safe-zone maskable

// ——— Android (stesse dimensioni dei file generati da `npx cap add android`) ———
const RES = 'android/app/src/main/res';
if (existsSync(RES)) {
  for (const dir of readdirSync(RES)) {
    for (const file of readdirSync(join(RES, dir))) {
      if (!file.endsWith('.png')) continue;
      const path = join(RES, dir, file);
      const { width, height } = await sharp(path).metadata();
      let out;
      if (file === 'splash.png') {
        const s = Math.round(Math.min(width, height) * 0.45);
        out = sharp({ create: { width, height, channels: 4, background: CREAM } }).composite([
          { input: await icon(s, s).png().toBuffer(), gravity: 'center' },
        ]);
      } else if (file === 'ic_launcher_foreground.png') {
        // Icona adattiva: il disegno resta nella zona sicura (cerchio di 66dp su 108dp), lo sfondo crema è il layer di fondo.
        out = icon(width, Math.round(width * 0.66));
      } else if (file === 'ic_launcher_round.png') {
        const mask = Buffer.from(`<svg width="${width}" height="${width}"><circle cx="${width / 2}" cy="${width / 2}" r="${width / 2}"/></svg>`);
        out = sharp(await icon(width, width).png().toBuffer()).composite([{ input: mask, blend: 'dest-in' }]);
      } else if (file === 'ic_launcher.png') {
        out = icon(width, width);
      } else {
        continue;
      }
      await out.png().toFile(path); // il disegno parte dall'SVG: sovrascrivere il file letto è sicuro
    }
  }
  writeFileSync(
    join(RES, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${CREAM}</color>\n</resources>\n`,
  );
}

// ——— Scheda Play Store: icona 512 e immagine in evidenza 1024×500 ———
mkdirSync('store', { recursive: true });
await icon(512, 512).png().toFile('store/icon-512.png');
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">
  <rect width="1024" height="500" fill="${CREAM}"/>
  <text x="540" y="250" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-size="80" font-weight="bold" fill="#073B4C">Arcobimbi</text>
  <text x="542" y="312" font-family="Arial, sans-serif" font-size="34" fill="#8A857B">Giornate piene di gioco</text>
</svg>`;
await sharp(Buffer.from(feature))
  .composite([{ input: await icon(420, 420).png().toBuffer(), left: 80, top: 40 }])
  .png()
  .toFile('store/feature-graphic.png');

console.log('Icone generate: web, Android e Play Store.');
