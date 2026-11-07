/**
 * Generates the illustrated road photos used by the demo seed:
 *   frontend/public/demo/<hazard>-<variant>.svg            ("citizen photo")
 *   frontend/public/demo/<hazard>-<variant>-annotated.svg  (with detector boxes)
 *
 * They are drawings, not real photos, so the demo never passes off a stock
 * image as a genuine report. Usage:  node utils/demo-images.js
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'frontend', 'public', 'demo');
const W = 1200;
const H = 800;
const HORIZON = 330;

// Two lighting variants per hazard: monsoon-grey daytime and warm evening.
const SCENES = [
  { sky: ['#b9c6cf', '#e3e8ea'], ground: ['#55625a', '#3a433d'], road: ['#5b5e60', '#3b3d3f'], tint: 'none' },
  { sky: ['#f3b27a', '#fde3c3'], ground: ['#4e5a45', '#2f3a2c'], road: ['#55514f', '#353230'], tint: 'rgba(255,140,60,0.08)' },
];

const BOXES = {
  pothole: [{ x1: 430, y1: 560, x2: 760, y2: 700 }, { x1: 560, y1: 520, x2: 860, y2: 650 }],
  road_crack: [{ x1: 420, y1: 470, x2: 820, y2: 720 }, { x1: 470, y1: 440, x2: 760, y2: 690 }],
  broken_road: [{ x1: 330, y1: 520, x2: 820, y2: 760 }, { x1: 470, y1: 500, x2: 930, y2: 740 }],
  open_manhole: [{ x1: 520, y1: 560, x2: 720, y2: 670 }, { x1: 610, y1: 520, x2: 790, y2: 620 }],
  waterlogging: [{ x1: 220, y1: 470, x2: 1000, y2: 780 }, { x1: 160, y1: 440, x2: 1080, y2: 790 }],
  debris: [{ x1: 470, y1: 520, x2: 810, y2: 690 }, { x1: 360, y1: 500, x2: 700, y2: 680 }],
};

const SEV_COLOR = { pothole: '#dc2626', open_manhole: '#dc2626', broken_road: '#ea580c', waterlogging: '#ea580c', debris: '#f59e0b', road_crack: '#f59e0b' };

// Deterministic pseudo-random so regenerating gives identical files.
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function backdrop(scene, r) {
  // Buildings, trees and the unmistakable tangle of overhead cables.
  let buildings = '';
  let x = -20;
  while (x < W) {
    const w = 60 + r() * 110;
    const h = 60 + r() * 150;
    const shade = Math.round(90 + r() * 60);
    buildings += `<rect x="${x.toFixed(0)}" y="${(HORIZON - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="rgb(${shade},${shade + 6},${shade + 4})"/>`;
    for (let wy = HORIZON - h + 14; wy < HORIZON - 16; wy += 26) {
      for (let wx = x + 10; wx < x + w - 14; wx += 22) {
        if (r() > 0.35) buildings += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="10" height="12" fill="rgba(30,40,40,0.35)"/>`;
      }
    }
    x += w + 4;
  }
  let trees = '';
  for (let i = 0; i < 7; i += 1) {
    const tx = r() * W;
    const s = 30 + r() * 40;
    trees += `<circle cx="${tx.toFixed(0)}" cy="${(HORIZON - s * 0.6).toFixed(0)}" r="${s.toFixed(0)}" fill="#3f6b45" opacity="0.9"/>`;
  }
  let wires = '';
  for (let i = 0; i < 6; i += 1) {
    const y1 = 120 + r() * 80;
    const y2 = 110 + r() * 90;
    wires += `<path d="M0 ${y1.toFixed(0)} Q ${W / 2} ${(y1 + 60 + r() * 50).toFixed(0)} ${W} ${y2.toFixed(0)}" stroke="#1f2422" stroke-width="${(1 + r() * 2).toFixed(1)}" fill="none" opacity="0.8"/>`;
  }
  return `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${scene.sky[0]}"/><stop offset="1" stop-color="${scene.sky[1]}"/></linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${scene.ground[0]}"/><stop offset="1" stop-color="${scene.ground[1]}"/></linearGradient>
    <linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${scene.road[0]}"/><stop offset="1" stop-color="${scene.road[1]}"/></linearGradient>
    <radialGradient id="hole" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#0b0b0b"/><stop offset="0.8" stop-color="#262626"/><stop offset="1" stop-color="#4a4a4a"/></radialGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8aa3ad" stop-opacity="0.85"/><stop offset="1" stop-color="#4f6a73" stop-opacity="0.9"/></linearGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0"/></filter>
  </defs>
  <rect width="${W}" height="${HORIZON}" fill="url(#sky)"/>
  ${buildings}${trees}
  <rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#ground)"/>
  <polygon points="520,${HORIZON} 680,${HORIZON} 1180,${H} 20,${H}" fill="url(#road)"/>
  <polygon points="590,${HORIZON} 610,${HORIZON} 640,${H} 560,${H}" fill="none"/>
  ${[0, 1, 2, 3, 4]
    .map((k) => {
      const t0 = k / 5 + 0.04;
      const t1 = t0 + 0.09;
      const y0 = HORIZON + (H - HORIZON) * t0 * t0;
      const y1 = HORIZON + (H - HORIZON) * t1 * t1;
      const w0 = 2 + 14 * t0;
      const w1 = 2 + 14 * t1;
      return `<polygon points="${600 - w0},${y0.toFixed(0)} ${600 + w0},${y0.toFixed(0)} ${600 + w1},${y1.toFixed(0)} ${600 - w1},${y1.toFixed(0)}" fill="#e8d27a" opacity="0.75"/>`;
    })
    .join('')}
  <line x1="0" y1="0" x2="0" y2="0"/>
  ${wires}
  <rect x="140" y="60" width="10" height="${HORIZON + 40}" fill="#2b2f2d"/>
  <rect x="1030" y="40" width="12" height="${HORIZON + 70}" fill="#2b2f2d"/>`;
}

function hazardShape(type, box, r) {
  const cx = (box.x1 + box.x2) / 2;
  const cy = (box.y1 + box.y2) / 2;
  const rx = (box.x2 - box.x1) / 2;
  const ry = (box.y2 - box.y1) / 2;
  switch (type) {
    case 'pothole':
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.92}" ry="${ry * 0.8}" fill="#6b6b6b" opacity="0.6"/>
        <ellipse cx="${cx}" cy="${cy + 4}" rx="${rx * 0.8}" ry="${ry * 0.62}" fill="url(#hole)"/>
        <ellipse cx="${cx + rx * 0.1}" cy="${cy + ry * 0.2}" rx="${rx * 0.4}" ry="${ry * 0.18}" fill="#56707a" opacity="0.55"/>`;
    case 'road_crack': {
      let d = '';
      for (let c = 0; c < 4; c += 1) {
        let x = box.x1 + r() * (box.x2 - box.x1) * 0.3;
        let y = box.y1 + r() * (box.y2 - box.y1);
        d += `M${x.toFixed(0)} ${y.toFixed(0)} `;
        for (let s = 0; s < 9; s += 1) {
          x += (box.x2 - box.x1) / 10 + (r() - 0.3) * 20;
          y += (r() - 0.5) * 50;
          y = Math.max(box.y1, Math.min(box.y2, y));
          d += `L${x.toFixed(0)} ${y.toFixed(0)} `;
        }
      }
      return `<path d="${d}" stroke="#151515" stroke-width="4" fill="none" stroke-linejoin="round"/>
        <path d="${d}" stroke="#777" stroke-width="1.2" fill="none" transform="translate(2 2)" opacity="0.6"/>`;
    }
    case 'broken_road': {
      const pts = [];
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 9) {
        const k = 0.7 + r() * 0.3;
        pts.push(`${(cx + Math.cos(a) * rx * k).toFixed(0)},${(cy + Math.sin(a) * ry * k).toFixed(0)}`);
      }
      let gravel = '';
      for (let g = 0; g < 70; g += 1) {
        const a = r() * Math.PI * 2;
        const k = r() * 0.75;
        gravel += `<circle cx="${(cx + Math.cos(a) * rx * k).toFixed(0)}" cy="${(cy + Math.sin(a) * ry * k).toFixed(0)}" r="${(2 + r() * 6).toFixed(1)}" fill="${r() > 0.5 ? '#8a7b66' : '#5d554a'}"/>`;
      }
      return `<polygon points="${pts.join(' ')}" fill="#6e5f4b"/>${gravel}`;
    }
    case 'open_manhole':
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.85}" ry="${ry * 0.75}" fill="#8a8f92"/>
        <ellipse cx="${cx}" cy="${cy + 3}" rx="${rx * 0.68}" ry="${ry * 0.58}" fill="#050505"/>
        <ellipse cx="${cx + rx * 1.3}" cy="${cy + ry * 0.4}" rx="${rx * 0.6}" ry="${ry * 0.35}" fill="#4a4f52" stroke="#2b2f31" stroke-width="3" transform="rotate(-12 ${cx + rx * 1.3} ${cy + ry * 0.4})"/>`;
    case 'waterlogging': {
      const pts = [];
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
        const k = 0.75 + r() * 0.25;
        pts.push(`${(cx + Math.cos(a) * rx * k).toFixed(0)},${(cy + Math.sin(a) * ry * k).toFixed(0)}`);
      }
      return `<polygon points="${pts.join(' ')}" fill="url(#water)"/>
        <ellipse cx="${cx - rx * 0.2}" cy="${cy - ry * 0.2}" rx="${rx * 0.35}" ry="${ry * 0.06}" fill="#ffffff" opacity="0.35"/>
        <ellipse cx="${cx + rx * 0.3}" cy="${cy + ry * 0.25}" rx="${rx * 0.25}" ry="${ry * 0.05}" fill="#ffffff" opacity="0.25"/>`;
    }
    case 'debris': {
      let s = '';
      for (let i = 0; i < 26; i += 1) {
        const x = box.x1 + 20 + r() * (box.x2 - box.x1 - 60);
        const y = box.y1 + 30 + r() * (box.y2 - box.y1 - 50);
        const brick = r() > 0.4;
        s += brick
          ? `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${(30 + r() * 20).toFixed(0)}" height="${(14 + r() * 8).toFixed(0)}" fill="${r() > 0.5 ? '#a4472f' : '#8e3b27'}" transform="rotate(${((r() - 0.5) * 50).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`
          : `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(6 + r() * 12).toFixed(0)}" fill="#7d7a73"/>`;
      }
      return `<ellipse cx="${cx}" cy="${box.y2 - 15}" rx="${rx}" ry="${ry * 0.35}" fill="#6f6658" opacity="0.7"/>${s}`;
    }
    default:
      return '';
  }
}

function annotation(type, box, confidence) {
  const color = SEV_COLOR[type];
  const label = `${type} ${confidence.toFixed(2)}`;
  const lw = label.length * 13 + 16;
  return `<rect x="${box.x1}" y="${box.y1}" width="${box.x2 - box.x1}" height="${box.y2 - box.y1}" fill="none" stroke="${color}" stroke-width="5" rx="6"/>
    <rect x="${box.x1 - 2}" y="${box.y1 - 38}" width="${lw}" height="34" fill="${color}" rx="4"/>
    <text x="${box.x1 + 8}" y="${box.y1 - 14}" font-family="monospace" font-size="22" font-weight="700" fill="#fff">${label}</text>`;
}

function render(type, variant, annotated) {
  const r = rng(1000 + variant * 97 + type.length * 13);
  const scene = SCENES[variant];
  const box = BOXES[type][variant];
  const body = backdrop(scene, r) + hazardShape(type, box, r);
  const overlay = annotated ? annotation(type, box, 0.78 + ((type.length * 7 + variant * 5) % 20) / 100) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${body}
  <rect width="${W}" height="${H}" fill="${scene.tint}"/>
  <rect width="${W}" height="${H}" filter="url(#grain)"/>
  ${overlay}
</svg>`;
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let n = 0;
  Object.keys(BOXES).forEach((type) => {
    [0, 1].forEach((variant) => {
      fs.writeFileSync(path.join(OUT, `${type}-${variant}.svg`), render(type, variant, false));
      fs.writeFileSync(path.join(OUT, `${type}-${variant}-annotated.svg`), render(type, variant, true));
      n += 2;
    });
  });
  console.log(`[demo-images] wrote ${n} files to ${OUT}`);
}

if (require.main === module) main();

module.exports = { BOXES };
