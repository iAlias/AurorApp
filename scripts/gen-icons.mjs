import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#FFF8E7"/>
  <g transform="translate(256,460)">
    ${['#9B5DE5','#5E7CE2','#4CC9F0','#7BC950','#FFD166','#FF9A3D','#FF5D5D']
      .map((c, i) => {
        const r = 340 - i * 34;
        return `<path d="M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0" stroke="${c}" stroke-width="26" stroke-linecap="round" fill="none"/>`;
      }).join('\n    ')}
  </g>
  <circle cx="130" cy="150" r="46" fill="#FFD166" stroke="#FF9A3D" stroke-width="4"/>
</svg>`;

writeFileSync('public/favicon.svg', svg);
const targets = [
  { file: 'public/icon-192.png', size: 192, padding: 0 },
  { file: 'public/icon-512.png', size: 512, padding: 0 },
  { file: 'public/icon-maskable-512.png', size: 512, padding: 64 }, // safe-zone maskable
];
for (const t of targets) {
  const inner = t.size - t.padding * 2;
  await sharp(Buffer.from(svg))
    .resize(inner, inner)
    .extend({ top: t.padding, bottom: t.padding, left: t.padding, right: t.padding,
              background: '#FFF8E7' })
    .png()
    .toFile(t.file);
}
console.log('Icone generate:', targets.map((t) => t.file).join(', '));
