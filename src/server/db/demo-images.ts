/**
 * Ilustrações vetoriais geradas localmente para a demonstração (sem depender de
 * imagens externas). São gravadas como SVG pelo seed.
 * Substitua-as enviando fotos reais pelo painel (Produtos > Editar > Imagem).
 */

export type CheeseShape =
  'wheel' | 'wedge' | 'fresh' | 'smoked' | 'herbs' | 'jar' | 'butter' | 'ricotta' | 'block';

interface Palette {
  bg1: string;
  bg2: string;
  paste: string;
  rind: string;
  accent: string;
}

const PALETTES: Record<CheeseShape, Palette> = {
  wheel: { bg1: '#efe3cc', bg2: '#d9c3a0', paste: '#f3d27a', rind: '#c98b2f', accent: '#2f4a33' },
  wedge: { bg1: '#e9e1cf', bg2: '#cdbb98', paste: '#f6dc8c', rind: '#d39a3d', accent: '#3d5a40' },
  fresh: { bg1: '#e8eee6', bg2: '#c9d6c4', paste: '#fbf8ef', rind: '#ece5d2', accent: '#2f4a33' },
  smoked: { bg1: '#e6d8c4', bg2: '#b99a76', paste: '#f0cf86', rind: '#8a5226', accent: '#3a2a1c' },
  herbs: { bg1: '#e7ecdc', bg2: '#c4cfa8', paste: '#f4e3a8', rind: '#c99a45', accent: '#3f6b3a' },
  jar: { bg1: '#efe4d3', bg2: '#d4bc98', paste: '#a8642d', rind: '#e9dcc4', accent: '#2f4a33' },
  butter: { bg1: '#f1ead7', bg2: '#dccfa9', paste: '#f7e08f', rind: '#efd36b', accent: '#2f4a33' },
  ricotta: { bg1: '#eef0ea', bg2: '#cfd5c6', paste: '#fdfbf4', rind: '#e9e3d3', accent: '#516b4b' },
  block: { bg1: '#ece3d1', bg2: '#cbb894', paste: '#f8f1dc', rind: '#e6d7b4', accent: '#2f4a33' },
};

function board(w: number, h: number): string {
  return `
  <ellipse cx="${w / 2}" cy="${h * 0.8}" rx="${w * 0.42}" ry="${h * 0.1}" fill="#000" opacity="0.10"/>
  <rect x="${w * 0.1}" y="${h * 0.66}" width="${w * 0.8}" height="${h * 0.12}" rx="${h * 0.05}" fill="#a8743f"/>
  <rect x="${w * 0.1}" y="${h * 0.66}" width="${w * 0.8}" height="${h * 0.04}" rx="${h * 0.02}" fill="#c08a52"/>
  <path d="M${w * 0.14} ${h * 0.73} q ${w * 0.2} -${h * 0.01} ${w * 0.4} 0 t ${w * 0.3} 0" stroke="#8d5e30" stroke-width="3" fill="none" opacity="0.5"/>`;
}

function leaves(x: number, y: number, color: string, s = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${color}">
    <path d="M0 0 C 30 -40, 80 -40, 110 -10 C 80 0, 40 10, 0 0 Z" opacity="0.9"/>
    <path d="M10 10 C 30 50, 80 60, 100 40 C 80 20, 40 10, 10 10 Z" opacity="0.75"/>
    <path d="M0 0 L 105 -8" stroke="#ffffff" stroke-opacity="0.35" stroke-width="3"/>
  </g>`;
}

function holes(
  cx: number,
  cy: number,
  color: string,
  seed: number,
  count = 7,
  spread = 160,
): string {
  let out = '';
  let s = seed;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < count; i++) {
    const x = cx + (rnd() - 0.5) * spread * 2;
    const y = cy + (rnd() - 0.5) * spread * 0.8;
    const r = 8 + rnd() * 16;
    out += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${r.toFixed(0)}" ry="${(r * 0.8).toFixed(0)}" fill="${color}" opacity="0.55"/>`;
  }
  return out;
}

function subject(shape: CheeseShape, p: Palette, w: number, h: number, seed: number): string {
  const cx = w / 2;
  const base = h * 0.68;
  switch (shape) {
    case 'wheel':
    case 'smoked':
    case 'herbs': {
      const rx = w * 0.27;
      const top = base - h * 0.26;
      const herbs =
        shape === 'herbs'
          ? Array.from({ length: 26 }, (_, i) => {
              const x = cx - rx + ((i * 97) % (rx * 2));
              const y = top + 10 + ((i * 53) % 60);
              return `<circle cx="${x}" cy="${y}" r="${4 + (i % 3)}" fill="${p.accent}" opacity="0.8"/>`;
            }).join('')
          : '';
      return `
      <path d="M${cx - rx} ${top} L${cx - rx} ${base - 20} A ${rx} ${h * 0.07} 0 0 0 ${cx + rx} ${base - 20} L ${cx + rx} ${top} Z" fill="${p.rind}"/>
      <ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${h * 0.07}" fill="${shape === 'herbs' ? p.paste : p.rind}" />
      <ellipse cx="${cx}" cy="${top}" rx="${rx * 0.93}" ry="${h * 0.058}" fill="${p.paste}" opacity="${shape === 'herbs' ? 1 : 0.35}"/>
      ${herbs}
      <path d="M${cx + rx * 0.15} ${top + 4} L ${cx + rx} ${top - 10} L ${cx + rx} ${base - 40} L ${cx + rx * 0.15} ${base - 8} Z" fill="${p.paste}"/>
      <path d="M${cx + rx * 0.15} ${top + 4} L ${cx + rx * 0.15} ${base - 8}" stroke="${p.rind}" stroke-width="6"/>
      ${holes(cx + rx * 0.58, (top + base) / 2, p.rind, seed, 4, 60)}
      ${shape === 'smoked' ? `<path d="M${cx - 60} ${top - 70} c 20 -30, -20 -50, 0 -80 M${cx + 10} ${top - 60} c 20 -30, -20 -50, 0 -80" stroke="#7a6a5a" stroke-width="6" fill="none" opacity="0.35" stroke-linecap="round"/>` : ''}`;
    }
    case 'wedge': {
      return `
      <path d="M${cx - w * 0.28} ${base - 10} L ${cx + w * 0.26} ${base - 10} L ${cx + w * 0.26} ${base - h * 0.3} Z" fill="${p.paste}"/>
      <path d="M${cx + w * 0.26} ${base - h * 0.3} L ${cx + w * 0.3} ${base - h * 0.27} L ${cx + w * 0.3} ${base - 14} L ${cx + w * 0.26} ${base - 10} Z" fill="${p.rind}"/>
      ${holes(cx + w * 0.08, base - h * 0.09, p.rind, seed, 6, 110)}`;
    }
    case 'fresh':
    case 'ricotta': {
      const rx = w * 0.22;
      const top = base - h * (shape === 'ricotta' ? 0.2 : 0.15);
      const texture =
        shape === 'ricotta'
          ? Array.from(
              { length: 40 },
              (_, i) =>
                `<circle cx="${cx - rx + ((i * 71) % (rx * 2))}" cy="${top + ((i * 37) % 120)}" r="3" fill="#e2dccb"/>`,
            ).join('')
          : '';
      return `
      <path d="M${cx - rx} ${top} L${cx - rx} ${base - 18} A ${rx} ${h * 0.06} 0 0 0 ${cx + rx} ${base - 18} L ${cx + rx} ${top} Z" fill="${p.rind}"/>
      <path d="M${cx - rx} ${top + 20} L${cx - rx} ${base - 18}" stroke="#d8cfba" stroke-width="2" stroke-dasharray="6 10"/>
      <ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${h * 0.06}" fill="${p.paste}"/>
      ${texture}
      ${leaves(cx + rx * 0.4, top - 16, p.accent, 0.8)}`;
    }
    case 'jar': {
      const jw = w * 0.2;
      const top = base - h * 0.34;
      return `
      <rect x="${cx - jw}" y="${top}" width="${jw * 2}" height="${h * 0.32}" rx="26" fill="#f4efe6" opacity="0.65"/>
      <rect x="${cx - jw + 10}" y="${top + 40}" width="${jw * 2 - 20}" height="${h * 0.32 - 50}" rx="20" fill="${p.paste}"/>
      <rect x="${cx - jw - 8}" y="${top - 30}" width="${jw * 2 + 16}" height="40" rx="10" fill="${p.accent}"/>
      <rect x="${cx - jw * 0.7}" y="${top + h * 0.11}" width="${jw * 1.4}" height="${h * 0.1}" rx="8" fill="${p.rind}"/>
      <path d="M${cx - jw * 0.45} ${top + h * 0.16} h ${jw * 0.9}" stroke="${p.accent}" stroke-width="6" stroke-linecap="round"/>`;
    }
    case 'butter': {
      return `
      <path d="M${cx - w * 0.22} ${base - 14} L ${cx - w * 0.16} ${base - h * 0.22} L ${cx + w * 0.24} ${base - h * 0.22} L ${cx + w * 0.2} ${base - 14} Z" fill="${p.paste}"/>
      <path d="M${cx - w * 0.16} ${base - h * 0.22} L ${cx + w * 0.24} ${base - h * 0.22} L ${cx + w * 0.27} ${base - h * 0.25} L ${cx - w * 0.12} ${base - h * 0.25} Z" fill="#fbeaa8"/>
      <path d="M${cx - w * 0.05} ${base - h * 0.25} q 30 -40 80 -10" stroke="#e9cf6c" stroke-width="14" fill="none" stroke-linecap="round"/>
      ${leaves(cx - w * 0.3, base - h * 0.12, p.accent, 0.6)}`;
    }
    case 'block': {
      return `
      <path d="M${cx - w * 0.24} ${base - 14} L ${cx - w * 0.24} ${base - h * 0.2} L ${cx + w * 0.2} ${base - h * 0.2} L ${cx + w * 0.2} ${base - 14} Z" fill="${p.paste}"/>
      <path d="M${cx - w * 0.24} ${base - h * 0.2} L ${cx - w * 0.17} ${base - h * 0.26} L ${cx + w * 0.27} ${base - h * 0.26} L ${cx + w * 0.2} ${base - h * 0.2} Z" fill="#fffaf0"/>
      <path d="M${cx + w * 0.2} ${base - 14} L ${cx + w * 0.27} ${base - h * 0.08} L ${cx + w * 0.27} ${base - h * 0.26} L ${cx + w * 0.2} ${base - h * 0.2} Z" fill="${p.rind}"/>
      <path d="M${cx - w * 0.2} ${base - h * 0.14} q 60 -20 120 0 t 120 0" stroke="#d7a96a" stroke-width="10" fill="none" opacity="0.55"/>`;
    }
  }
}

export function productSvg(shape: CheeseShape, seed = 1): string {
  const w = 1600;
  const h = 1200;
  const p = PALETTES[shape];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="80%">
      <stop offset="0%" stop-color="${p.bg1}"/><stop offset="100%" stop-color="${p.bg2}"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <circle cx="${w * 0.82}" cy="${h * 0.2}" r="${h * 0.09}" fill="#ffffff" opacity="0.25"/>
  ${board(w, h)}
  ${subject(shape, p, w, h, seed)}
  ${leaves(w * 0.12, h * 0.62, p.accent, 0.9)}
</svg>`;
}

/** Paisagem serrana com tábua de queijos — imagem principal da página inicial. */
export function heroSvg(): string {
  const w = 1920;
  const h = 1200;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f3e6cc"/><stop offset="100%" stop-color="#e7d3ad"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <circle cx="1420" cy="300" r="120" fill="#f8d98f" opacity="0.8"/>
  <path d="M0 640 C 260 470, 470 520, 720 600 C 980 680, 1200 460, 1480 520 C 1680 560, 1820 520, 1920 480 L1920 1200 L0 1200 Z" fill="#7d9a6c" opacity="0.65"/>
  <path d="M0 760 C 300 620, 620 700, 900 760 C 1180 820, 1460 640, 1920 700 L1920 1200 L0 1200 Z" fill="#4f6f4a"/>
  <path d="M0 880 C 380 800, 760 860, 1100 900 C 1400 930, 1660 860, 1920 880 L1920 1200 L0 1200 Z" fill="#2f4a33"/>
  ${Array.from({ length: 9 }, (_, i) => {
    const x = 120 + i * 210;
    const y = 700 + ((i * 37) % 60);
    return `<path d="M${x} ${y} l 26 -90 l 26 90 Z" fill="#284030" opacity="0.8"/>`;
  }).join('')}
  <g transform="translate(940 560) scale(1.15)">
    <ellipse cx="400" cy="400" rx="430" ry="70" fill="#000" opacity="0.18"/>
    <rect x="0" y="300" width="800" height="90" rx="40" fill="#a8743f"/>
    <rect x="0" y="300" width="800" height="30" rx="15" fill="#c08a52"/>
    <path d="M120 120 L120 290 A 170 36 0 0 0 460 290 L 460 120 Z" fill="#c98b2f"/>
    <ellipse cx="290" cy="120" rx="170" ry="36" fill="#d8a24a"/>
    <path d="M330 124 L 460 112 L 460 260 L 330 300 Z" fill="#f3d27a"/>
    <ellipse cx="400" cy="200" rx="16" ry="12" fill="#c98b2f" opacity="0.5"/>
    <ellipse cx="370" cy="250" rx="10" ry="8" fill="#c98b2f" opacity="0.5"/>
    <path d="M520 296 L 740 296 L 740 170 Z" fill="#f6dc8c"/>
    <path d="M740 170 L 760 184 L 760 290 L 740 296 Z" fill="#d39a3d"/>
    <ellipse cx="660" cy="262" rx="14" ry="10" fill="#d39a3d" opacity="0.55"/>
    <g transform="translate(40 250)" fill="#3f6b3a"><path d="M0 0 C 30 -40, 80 -40, 110 -10 C 80 0, 40 10, 0 0 Z"/></g>
  </g>
</svg>`;
}

/** Ambiente da queijaria — imagem da seção "Sobre". */
export function aboutSvg(): string {
  const w = 1600;
  const h = 1200;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#e9dcc3"/>
  <rect x="0" y="820" width="${w}" height="380" fill="#b88a5a"/>
  ${Array.from(
    { length: 4 },
    (_, row) =>
      `<rect x="160" y="${200 + row * 170}" width="1280" height="18" rx="6" fill="#8d5e30"/>` +
      Array.from({ length: 6 }, (_, i) => {
        const x = 230 + i * 200;
        const y = 200 + row * 170;
        const c = ['#c98b2f', '#d39a3d', '#b77a28', '#e0ae54'][(i + row) % 4];
        return `<path d="M${x - 70} ${y - 70} L${x - 70} ${y - 8} A 70 16 0 0 0 ${x + 70} ${y - 8} L ${x + 70} ${y - 70} Z" fill="${c}"/><ellipse cx="${x}" cy="${y - 70}" rx="70" ry="16" fill="#e7bd6a"/>`;
      }).join(''),
  ).join('')}
  <rect x="0" y="0" width="${w}" height="${h}" fill="#1f3d2b" opacity="0.06"/>
</svg>`;
}
