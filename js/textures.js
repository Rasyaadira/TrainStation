/**
 * Canvas-generated textures.
 *
 * The project intentionally ships without image files. Everything from concrete
 * and window grids to station signs and drink labels is painted here at load
 * time. Textures are kept small and repeatable so startup stays quick.
 */
import * as THREE from 'three';

const JP_SERIF = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", "YuMincho", serif';
const JP_SANS = '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", "YuGothic", sans-serif';

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

function prng(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function speckles(ctx, width, height, count, random, radius = [0.5, 2.2], colors = ['#000', '#fff']) {
  for (let i = 0; i < count; i += 1) {
    const size = radius[0] + random() * (radius[1] - radius[0]);
    ctx.globalAlpha = 0.03 + random() * 0.12;
    ctx.fillStyle = colors[Math.floor(random() * colors.length)];
    ctx.beginPath();
    ctx.arc(random() * width, random() * height, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function canvasTexture(width, height, painter, options = {}) {
  const { canvas, ctx } = makeCanvas(width, height);
  painter(ctx, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  const wrap = options.wrap ?? THREE.ClampToEdgeWrapping;
  texture.wrapS = wrap;
  texture.wrapT = wrap;
  texture.colorSpace = options.colorSpace ?? THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = options.anisotropy ?? 4;
  if (options.repeat) {
    texture.repeat.set(options.repeat[0], options.repeat[1]);
  }
  texture.needsUpdate = true;
  return texture;
}

export function createPlatformTexture(repeatX = 1, repeatY = 1) {
  const tex = canvasTexture(512, 512, (ctx, w, h) => {
    const random = prng(104);
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#c8c2b4');
    gradient.addColorStop(0.55, '#bdb7a9');
    gradient.addColorStop(1, '#c5bfb0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    speckles(ctx, w, h, 2100, random, [0.35, 1.6], ['#5b574f', '#e9e4d8', '#736e64']);

    // Expansion joints every quarter of the tile.
    ctx.strokeStyle = 'rgba(92, 86, 76, 0.24)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 2; i += 1) {
      const p = i * w / 2;
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(w, p);
      ctx.stroke();
    }
    const stain = ctx.createRadialGradient(380, 180, 10, 380, 180, 190);
    stain.addColorStop(0, 'rgba(80, 73, 63, 0.07)');
    stain.addColorStop(1, 'rgba(80, 73, 63, 0)');
    ctx.fillStyle = stain;
    ctx.fillRect(0, 0, w, h);
  }, { wrap: THREE.RepeatWrapping, repeat: [repeatX, repeatY] });
  return tex;
}

export function createConcreteTexture(repeatX = 2, repeatY = 1) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const random = prng(322);
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#a9a397');
    gradient.addColorStop(0.5, '#b5afa2');
    gradient.addColorStop(1, '#9f998d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    speckles(ctx, w, h, 900, random, [0.3, 1.5], ['#625e56', '#ddd8cc']);
    ctx.strokeStyle = 'rgba(65, 61, 55, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, 0);
    ctx.lineTo(w * 0.5, h);
    ctx.stroke();

    for (let i = 0; i < 7; i += 1) {
      const x = random() * w;
      const drip = ctx.createLinearGradient(x, 0, x, h * (0.35 + random() * 0.6));
      drip.addColorStop(0, 'rgba(80, 74, 66, 0)');
      drip.addColorStop(0.5, 'rgba(80, 74, 66, 0.05)');
      drip.addColorStop(1, 'rgba(80, 74, 66, 0)');
      ctx.fillStyle = drip;
      ctx.fillRect(x, 0, 2 + random() * 3, h);
    }
  }, { wrap: THREE.RepeatWrapping, repeat: [repeatX, repeatY] });
}

export function createBallastTexture(repeatX = 36, repeatY = 3) {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const random = prng(884);
    ctx.fillStyle = '#615e57';
    ctx.fillRect(0, 0, w, h);
    const colors = ['#8c8779', '#a09b8f', '#736f66', '#bbb5a7', '#56544e', '#c7c0b1'];
    for (let i = 0; i < 2800; i += 1) {
      const x = random() * w;
      const y = random() * h;
      const r = 1.5 + random() * 6;
      ctx.fillStyle = colors[Math.floor(random() * colors.length)];
      ctx.globalAlpha = 0.4 + random() * 0.5;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      for (let p = 1; p <= 5; p += 1) {
        const angle = (p / 5) * Math.PI * 2;
        const rad = r * (0.58 + random() * 0.55);
        ctx.lineTo(x + Math.cos(angle) * rad, y + Math.sin(angle) * rad);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(36, 34, 30, 0.13)';
    ctx.fillRect(0, 0, w, h);
  }, { wrap: THREE.RepeatWrapping, repeat: [repeatX, repeatY] });
}

export function createAsphaltTexture(repeatX = 4, repeatY = 4) {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const random = prng(913);
    ctx.fillStyle = '#5b5b56';
    ctx.fillRect(0, 0, w, h);
    speckles(ctx, w, h, 3000, random, [0.3, 1.2], ['#252623', '#8b8a80', '#c4c0b4']);
    for (let i = 0; i < 10; i += 1) {
      ctx.strokeStyle = `rgba(38, 38, 35, ${0.05 + random() * 0.07})`;
      ctx.lineWidth = 1 + random() * 2;
      ctx.beginPath();
      ctx.moveTo(random() * w, random() * h);
      ctx.bezierCurveTo(random() * w, random() * h, random() * w, random() * h, random() * w, random() * h);
      ctx.stroke();
    }
  }, { wrap: THREE.RepeatWrapping, repeat: [repeatX, repeatY] });
}

export function createGrassTexture(repeatX = 18, repeatY = 18) {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const random = prng(777);
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#7f8758');
    gradient.addColorStop(0.5, '#747f50');
    gradient.addColorStop(1, '#677346');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 2400; i += 1) {
      const x = random() * w;
      const y = random() * h;
      const length = 2 + random() * 7;
      ctx.strokeStyle = ['rgba(150,151,91,.42)', 'rgba(94,107,60,.5)', 'rgba(182,161,88,.27)'][Math.floor(random() * 3)];
      ctx.lineWidth = 0.6 + random();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (random() - 0.5) * 4, y - length * 0.6, x + (random() - 0.5) * 7, y - length);
      ctx.stroke();
    }
    for (let i = 0; i < 35; i += 1) {
      ctx.fillStyle = ['rgba(194,155,80,.16)', 'rgba(107,104,71,.16)'][i % 2];
      ctx.beginPath();
      ctx.arc(random() * w, random() * h, 15 + random() * 45, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { wrap: THREE.RepeatWrapping, repeat: [repeatX, repeatY] });
}

export function createTactileTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d2b24e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(122, 99, 35, 0.16)';
    ctx.fillRect(0, 0, w, 3);
    ctx.fillRect(0, h - 3, w, 3);
    for (let i = 0; i < 4; i += 1) {
      const x = 15 + i * 28;
      ctx.fillStyle = '#e1c467';
      ctx.beginPath();
      ctx.roundRect(x, 13, 12, 102, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(138, 108, 36, 0.23)';
      ctx.beginPath();
      ctx.roundRect(x + 8, 14, 3, 100, 2);
      ctx.fill();
    }
  }, { wrap: THREE.RepeatWrapping, repeat: [1, 1] });
}

export function createWoodTexture(repeatX = 1, repeatY = 1) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const random = prng(233);
    ctx.fillStyle = '#896648';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 95; i += 1) {
      const y = random() * h;
      ctx.strokeStyle = `rgba(${52 + random() * 24}, ${37 + random() * 18}, ${26 + random() * 12}, ${0.07 + random() * 0.16})`;
      ctx.lineWidth = 0.5 + random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + (random() - 0.5) * 9, w * 0.7, y + (random() - 0.5) * 9, w, y + (random() - 0.5) * 4);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(54, 37, 24, 0.12)';
    ctx.fillRect(0, 0, w, 2);
    ctx.fillRect(0, h - 2, w, 2);
  }, { wrap: THREE.RepeatWrapping, repeat: [repeatX, repeatY] });
}

export function createRoofTexture(repeatX = 4, repeatY = 2) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const random = prng(452);
    ctx.fillStyle = '#737a78';
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) {
      ctx.fillStyle = 'rgba(36, 42, 42, 0.18)';
      ctx.fillRect(x, 0, 2, h);
      ctx.fillStyle = 'rgba(224, 225, 214, 0.08)';
      ctx.fillRect(x + 3, 0, 2, h);
    }
    speckles(ctx, w, h, 500, random, [0.3, 1.8], ['#474d4b', '#b5b4a8']);
  }, { wrap: THREE.RepeatWrapping, repeat: [repeatX, repeatY] });
}

export function createHazardTexture() {
  return canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#e6d5a7';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3c3a34';
    const stripe = 36;
    ctx.save();
    ctx.translate(-h, 0);
    for (let x = -h; x < w + h; x += stripe * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripe, 0);
      ctx.lineTo(x + stripe + h, h);
      ctx.lineTo(x + h, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.13)';
    ctx.fillRect(0, 0, w, 2);
  }, { wrap: THREE.RepeatWrapping, repeat: [3, 1] });
}

const BUILDING_PALETTES = [
  { wall: '#c9c9c2', window: '#7f969d', trim: '#adb0aa', lit: '#f4dca9' },
  { wall: '#b8b7ae', window: '#6f868c', trim: '#95968e', lit: '#f2d7a2' },
  { wall: '#d4d0c5', window: '#82969a', trim: '#b9b6aa', lit: '#f8e0ad' },
  { wall: '#b0b1ab', window: '#687b80', trim: '#8b8d88', lit: '#f1d9a8' },
  { wall: '#d8d2c5', window: '#8a9da1', trim: '#bcb4a7', lit: '#f6dfb4' }
];

export function createBuildingTexture(styleIndex = 0, seed = 1) {
  const palette = BUILDING_PALETTES[styleIndex % BUILDING_PALETTES.length];
  return canvasTexture(256, 512, (ctx, w, h) => {
    const random = prng(seed * 7919 + styleIndex * 43);
    ctx.fillStyle = palette.wall;
    ctx.fillRect(0, 0, w, h);

    // Subtle concrete panel bands.
    for (let y = 0; y < h; y += 64) {
      ctx.fillStyle = 'rgba(44, 44, 40, 0.035)';
      ctx.fillRect(0, y, w, 3);
    }

    const columns = styleIndex % 2 === 0 ? 6 : 5;
    const rows = 12;
    const cellW = w / columns;
    const cellH = h / rows;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const x = col * cellW + cellW * 0.2;
        const y = row * cellH + cellH * 0.2;
        const ww = cellW * 0.6;
        const wh = cellH * 0.48;

        // Window recess and glass.
        ctx.fillStyle = 'rgba(44, 45, 43, 0.14)';
        ctx.fillRect(x - 2, y - 2, ww + 4, wh + 4);
        ctx.fillStyle = palette.window;
        ctx.fillRect(x, y, ww, wh);

        const reflection = ctx.createLinearGradient(x, y, x + ww, y + wh);
        reflection.addColorStop(0, 'rgba(255, 255, 255, 0.27)');
        reflection.addColorStop(0.47, 'rgba(255, 255, 255, 0.04)');
        reflection.addColorStop(1, 'rgba(20, 31, 35, 0.22)');
        ctx.fillStyle = reflection;
        ctx.fillRect(x, y, ww, wh);

        if (random() < 0.085) {
          ctx.fillStyle = palette.lit;
          ctx.globalAlpha = 0.72;
          ctx.fillRect(x, y, ww, wh);
          ctx.globalAlpha = 1;
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.fillRect(x + ww * 0.49, y, 1, wh);
        ctx.fillRect(x, y + wh * 0.52, ww, 1);
      }

      // Apartment balcony bands.
      if (styleIndex === 0 || styleIndex === 2) {
        ctx.fillStyle = 'rgba(81, 79, 72, 0.11)';
        ctx.fillRect(0, row * cellH + cellH * 0.78, w, 3);
        for (let col = 0; col < columns; col += 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.fillRect(col * cellW + 2, row * cellH + cellH * 0.7, cellW - 4, 2);
        }
      }
    }

    // Roof edge and grime.
    ctx.fillStyle = palette.trim;
    ctx.fillRect(0, 0, w, 7);
    const grime = ctx.createLinearGradient(0, h * 0.72, 0, h);
    grime.addColorStop(0, 'rgba(66, 62, 54, 0)');
    grime.addColorStop(1, 'rgba(66, 62, 54, 0.13)');
    ctx.fillStyle = grime;
    ctx.fillRect(0, 0, w, h);
  });
}

function fitFont(ctx, text, maxWidth, startSize, weight = '400', family = JP_SERIF) {
  let size = startSize;
  while (size > 9) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

export function createStationSignTexture({ nameJP, nameEN, lineColor = '#6f8f7f', prevJP = '', nextJP = '' }) {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f4f0e6';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = lineColor;
    ctx.fillRect(0, 0, w, 23);
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.font = `600 11px ${JP_SANS}`;
    ctx.textAlign = 'left';
    ctx.fillText('LOCAL LINE', 34, 16);
    ctx.textAlign = 'right';
    ctx.fillText('JR', w - 33, 16);

    ctx.strokeStyle = 'rgba(64, 59, 50, 0.24)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3);

    ctx.fillStyle = '#3d3a33';
    ctx.textAlign = 'left';
    const jpSize = fitFont(ctx, nameJP, 510, 89, '600', JP_SERIF);
    ctx.font = `600 ${jpSize}px ${JP_SERIF}`;
    ctx.fillText(nameJP, 55, 126);

    ctx.fillStyle = '#766f62';
    ctx.font = `500 25px ${JP_SANS}`;
    ctx.fillText(nameEN.toUpperCase(), 59, 171);

    ctx.fillStyle = 'rgba(81, 75, 64, 0.11)';
    ctx.fillRect(646, 44, 2, 168);

    ctx.fillStyle = '#8b8274';
    ctx.font = `500 15px ${JP_SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('←  ' + (prevJP || '　'), 776, 84);
    ctx.fillText((nextJP || '　') + '  →', 903, 84);

    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(839, 143, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7f2e7';
    ctx.font = `600 15px ${JP_SANS}`;
    ctx.fillText('STOP', 839, 148);
    ctx.fillStyle = '#9b9283';
    ctx.font = `400 11px ${JP_SANS}`;
    ctx.fillText('EAST LINE · 2', 839, 210);
  });
}

export function createPosterTexture({ title = '旅', subtitle = 'TRAVEL', bg = '#d4b993', accent = '#6e7f6d', motif = 'sun' }) {
  return canvasTexture(384, 560, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    if (motif === 'train') {
      ctx.fillStyle = accent;
      ctx.fillRect(40, 250, 300, 86);
      ctx.fillRect(65, 208, 250, 44);
      ctx.fillStyle = 'rgba(245, 239, 226, 0.82)';
      for (let x = 82; x < 300; x += 54) ctx.fillRect(x, 224, 36, 22);
      ctx.fillStyle = '#4b514d';
      ctx.beginPath();
      ctx.arc(106, 338, 25, 0, Math.PI * 2);
      ctx.arc(276, 338, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(22, 365, 340, 4);
    } else if (motif === 'mountain') {
      ctx.fillStyle = 'rgba(94, 115, 101, 0.42)';
      ctx.beginPath();
      ctx.moveTo(20, 300);
      ctx.lineTo(154, 120);
      ctx.lineTo(250, 270);
      ctx.lineTo(315, 180);
      ctx.lineTo(380, 330);
      ctx.lineTo(380, 410);
      ctx.lineTo(0, 410);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(280, 110, 63, 0, Math.PI * 2);
      ctx.fill();
    } else if (motif === 'cup') {
      ctx.fillStyle = 'rgba(255, 250, 239, 0.65)';
      ctx.beginPath();
      ctx.ellipse(192, 270, 110, 44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(120, 250, 150, 118, 20);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(274, 302, 45, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(160 + i * 34, 222 - i * 12, 23, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(220, 205, 98, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 250, 239, 0.25)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i += 1) {
        ctx.beginPath();
        ctx.arc(190, 240, 40 + i * 17, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.fillStyle = 'rgba(249, 244, 233, 0.88)';
    ctx.fillRect(28, 26, w - 56, 2);
    ctx.fillStyle = '#3f3a32';
    ctx.textAlign = 'left';
    ctx.font = `600 52px ${JP_SERIF}`;
    ctx.fillText(title, 42, 92);
    ctx.fillStyle = 'rgba(58, 53, 44, 0.58)';
    ctx.font = `700 12px ${JP_SANS}`;
    ctx.fillText(subtitle, 44, 120);

    ctx.fillStyle = 'rgba(35, 33, 28, 0.58)';
    ctx.font = `500 11px ${JP_SANS}`;
    ctx.fillText('EARLY AUTUMN', 42, h - 58);
    ctx.fillStyle = '#f2eadb';
    ctx.fillRect(42, h - 41, 96, 1);
  });
}

export function createBillboardTexture({ text = 'CITY', subtext = 'DAYLIGHT', bg = '#5f776f', fg = '#f2ead9' }) {
  return canvasTexture(640, 320, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i += 1) {
      ctx.strokeStyle = 'rgba(255,255,255,.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w * 0.72, h * 0.48, 35 + i * 35, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.13)';
    ctx.beginPath();
    ctx.arc(w * 0.22, h * 0.35, 98, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fg;
    ctx.font = `600 88px ${JP_SERIF}`;
    ctx.textAlign = 'left';
    ctx.fillText(text, 43, 166);
    ctx.font = `600 15px ${JP_SANS}`;
    ctx.fillText(subtext, 47, 208);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(47, 231, 150, 2);
    ctx.font = `400 11px ${JP_SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,.62)';
    ctx.fillText('青凪 / AONAGI', 47, 262);
    ctx.textAlign = 'right';
    ctx.fillText('12:43', w - 40, 277);
  });
}

export function createVerticalSignTexture({ text = '喫茶', bg = '#39564e', fg = '#f7eddb', sub = 'COFFEE' }) {
  return canvasTexture(192, 640, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255, 247, 230, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = fg;
    ctx.font = `600 67px ${JP_SERIF}`;
    ctx.textAlign = 'center';
    const chars = Array.from(text);
    chars.forEach((char, index) => {
      ctx.fillText(char, w / 2, 98 + index * 88);
    });
    ctx.font = `600 13px ${JP_SANS}`;
    ctx.fillText(sub, w / 2, h - 38);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(40, h - 58, w - 80, 1);
  });
}

export function createTimetableTexture() {
  return canvasTexture(448, 640, (ctx, w, h) => {
    ctx.fillStyle = '#f3eee2';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5d7d70';
    ctx.fillRect(0, 0, w, 70);
    ctx.fillStyle = '#f8f2e5';
    ctx.font = `600 25px ${JP_SERIF}`;
    ctx.fillText('時刻表', 24, 34);
    ctx.font = `500 10px ${JP_SANS}`;
    ctx.fillText('TRAIN TIMETABLE · WEEKDAYS', 25, 53);
    ctx.fillStyle = '#696255';
    ctx.font = `500 11px ${JP_SANS}`;
    ctx.fillText('HOUR', 23, 98);
    ctx.fillText('DEPARTURES', 104, 98);
    ctx.fillStyle = 'rgba(72, 65, 54, 0.16)';
    ctx.fillRect(20, 108, w - 40, 1);

    const times = ['12:02', '12:17', '12:29', '12:43', '12:58', '13:09', '13:24', '13:38', '13:52', '14:06'];
    times.forEach((time, index) => {
      const y = 139 + index * 41;
      ctx.fillStyle = index === 3 ? '#9b7254' : '#5b554b';
      ctx.font = `500 14px ${JP_SANS}`;
      ctx.fillText(time.slice(0, 2), 25, y);
      ctx.font = `400 15px ${JP_SANS}`;
      ctx.fillText(time.slice(3), 104, y);
      ctx.fillStyle = index % 3 === 0 ? '#789081' : '#9b9384';
      ctx.font = `400 9px ${JP_SANS}`;
      ctx.fillText(index % 3 === 0 ? 'LOCAL  ·  EAST' : 'LOCAL  ·  EAST', 213, y);
      ctx.fillStyle = 'rgba(72, 65, 54, 0.11)';
      ctx.fillRect(20, y + 15, w - 40, 1);
    });

    ctx.fillStyle = '#8d8475';
    ctx.font = `400 9px ${JP_SANS}`;
    ctx.fillText('Please stand behind the yellow line.', 24, h - 28);
  });
}

export function createVendingPanelTexture(drinks) {
  return canvasTexture(512, 768, (ctx, w, h) => {
    const random = prng(551);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#f8fbfa');
    bg.addColorStop(0.18, '#eaf3f1');
    bg.addColorStop(0.78, '#dce7e4');
    bg.addColorStop(1, '#cad7d2');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillRect(18, 18, w - 36, 2);
    ctx.fillStyle = '#3e554f';
    ctx.font = `600 20px ${JP_SANS}`;
    ctx.textAlign = 'left';
    ctx.fillText('DRINKS', 28, 52);
    ctx.fillStyle = '#7c928c';
    ctx.font = `500 11px ${JP_SANS}`;
    ctx.fillText('つめた〜い ・ あったか〜い', 29, 71);
    ctx.fillStyle = '#7d9c94';
    ctx.beginPath();
    ctx.arc(w - 39, 45, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4fbf8';
    ctx.fillRect(w - 42, 39, 6, 12);

    const columns = 4;
    const rows = 2;
    const left = 22;
    const top = 92;
    const cellW = (w - 44) / columns;
    const cellH = 226;

    drinks.slice(0, 8).forEach((drink, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cx = left + colCellCenter(column, cellW);
      const cy = top + row * cellH;

      ctx.fillStyle = 'rgba(255,255,255,.44)';
      ctx.beginPath();
      ctx.roundRect(cx - cellW * 0.43, cy, cellW * 0.86, 195, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(76, 100, 93, 0.11)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Can.
      const canX = cx - 28;
      const canY = cy + 16;
      const canGradient = ctx.createLinearGradient(canX, 0, canX + 56, 0);
      canGradient.addColorStop(0, shade(drink.color, -26));
      canGradient.addColorStop(0.33, drink.accent || '#f4ead4');
      canGradient.addColorStop(0.66, drink.color);
      canGradient.addColorStop(1, shade(drink.color, -35));
      ctx.fillStyle = canGradient;
      ctx.beginPath();
      ctx.roundRect(canX, canY, 56, 128, 6);
      ctx.fill();
      ctx.fillStyle = '#dce1dd';
      ctx.fillRect(canX, canY - 4, 56, 9);
      ctx.fillStyle = 'rgba(50,50,45,.36)';
      ctx.fillRect(canX + 4, canY + 98, 48, 2);
      ctx.fillStyle = drink.labelColor || '#34352f';
      ctx.font = `600 16px ${JP_SERIF}`;
      ctx.textAlign = 'center';
      ctx.fillText(drink.label || '茶', cx, canY + 68);
      ctx.font = `600 7px ${JP_SANS}`;
      ctx.fillText(drink.temp === 'HOT' ? 'HOT' : 'COLD', cx, canY + 84);

      // Price and selection button.
      ctx.fillStyle = '#48635a';
      ctx.font = `600 19px ${JP_SERIF}`;
      ctx.fillText(`¥${drink.price}`, cx, cy + 175);
      ctx.fillStyle = index < 4 ? '#d17055' : '#6d8c9b';
      ctx.beginPath();
      ctx.roundRect(cx - 13, cy + 183, 26, 6, 3);
      ctx.fill();
      ctx.fillStyle = '#f7f7f3';
      ctx.font = `500 8px ${JP_SANS}`;
      ctx.fillText(String(index + 1), cx, cy + 188);
    });

    // Lower metal control strip.
    ctx.fillStyle = '#b5c1bc';
    ctx.fillRect(0, 575, w, h - 575);
    ctx.fillStyle = 'rgba(255,255,255,.27)';
    ctx.fillRect(0, 575, w, 3);
    ctx.fillStyle = '#54615c';
    ctx.font = `600 10px ${JP_SANS}`;
    ctx.textAlign = 'left';
    ctx.fillText('PUSH', 36, 612);
    for (let i = 0; i < 4; i += 1) {
      ctx.fillStyle = '#d7dad4';
      ctx.beginPath();
      ctx.roundRect(36 + i * 34, 628, 23, 11, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(56,64,59,.28)';
      ctx.fillRect(40 + i * 34, 632, 15, 2);
    }

    // Coin slot / bill slot illustrations.
    ctx.fillStyle = '#56615d';
    ctx.fillRect(305, 609, 66, 5);
    ctx.fillStyle = '#e1e4de';
    ctx.fillRect(308, 617, 60, 26);
    ctx.fillStyle = '#4b544f';
    ctx.fillRect(337, 620, 3, 20);
    ctx.fillStyle = 'rgba(255,255,255,.36)';
    ctx.fillRect(403, 613, 62, 28);
    ctx.strokeStyle = 'rgba(57,65,61,.35)';
    ctx.strokeRect(403, 613, 62, 28);

    // Pickup slot.
    ctx.fillStyle = '#3d4743';
    ctx.beginPath();
    ctx.roundRect(75, 675, w - 150, 54, 6);
    ctx.fill();
    ctx.fillStyle = '#212823';
    ctx.beginPath();
    ctx.roundRect(88, 685, w - 176, 32, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.17)';
    ctx.fillRect(112, 688, w - 224, 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c7d1cc';
    ctx.font = `500 8px ${JP_SANS}`;
    ctx.fillText('DRINK · 取出し口', w / 2, h - 20);
  });
}

function colCellCenter(column, cellWidth) {
  return column * cellWidth + cellWidth / 2;
}

function shade(hex, amount) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const value = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (value >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((value >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (value & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function createCanTexture(drink) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, shade(drink.color, -30));
    gradient.addColorStop(0.25, drink.accent || '#f1e7d2');
    gradient.addColorStop(0.55, drink.color);
    gradient.addColorStop(0.8, shade(drink.color, -15));
    gradient.addColorStop(1, shade(drink.color, -36));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(224, 228, 222, 0.9)';
    ctx.fillRect(0, 0, w, 12);
    ctx.fillRect(0, h - 15, w, 15);
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillRect(0, 80, w, 2);
    ctx.fillRect(0, 168, w, 2);
    ctx.fillStyle = drink.labelColor || '#30332d';
    ctx.font = `600 42px ${JP_SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText(drink.label || '茶', w * 0.25, 135);
    ctx.fillText(drink.label || '茶', w * 0.75, 135);
    ctx.font = `600 12px ${JP_SANS}`;
    ctx.fillText(drink.temp === 'HOT' ? 'HOT' : 'COLD', w * 0.25, 161);
    ctx.fillText(drink.temp === 'HOT' ? 'HOT' : 'COLD', w * 0.75, 161);
  }, { wrap: THREE.RepeatWrapping, repeat: [2, 1] });
}

export function createLedBoardTexture({ title = 'DEPARTURES', rows = [] }) {
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#151916';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(129, 203, 163, 0.08)';
    for (let x = 0; x < w; x += 4) ctx.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);

    ctx.fillStyle = '#d3a75f';
    ctx.font = `600 13px ${JP_SANS}`;
    ctx.fillText(title, 22, 31);
    ctx.fillStyle = 'rgba(211,167,95,.35)';
    ctx.fillRect(20, 41, w - 40, 1);

    const displayRows = rows.length ? rows : [
      { time: '12:43', dest: '各停  青凪', track: '2' },
      { time: '12:58', dest: '各停  昼下がり', track: '1' },
      { time: '13:12', dest: '快速  海辺', track: '2' }
    ];
    displayRows.slice(0, 4).forEach((row, index) => {
      const y = 72 + index * 43;
      ctx.fillStyle = index === 0 ? '#f2d79d' : '#d09f58';
      ctx.font = `500 15px ${JP_SANS}`;
      ctx.fillText(row.time || '--:--', 22, y);
      ctx.fillStyle = index === 0 ? '#fff0c6' : '#b78a4d';
      ctx.fillText(row.dest || 'LOCAL', 96, y);
      ctx.textAlign = 'right';
      ctx.fillText(row.track || '1', w - 24, y);
      ctx.textAlign = 'left';
    });
    ctx.fillStyle = 'rgba(106, 158, 132, 0.38)';
    ctx.font = `500 9px ${JP_SANS}`;
    ctx.fillText('LOCAL LINE  ·  ALL STATIONS', 22, h - 15);
  });
}

export function createTrainDestinationTexture(nameJP, nameEN) {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#111511';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    for (let x = 0; x < w; x += 5) ctx.fillRect(x, 0, 1, h);
    ctx.fillStyle = '#e1b667';
    ctx.font = `600 44px ${JP_SERIF}`;
    ctx.textAlign = 'left';
    ctx.fillText('各停', 25, 74);
    ctx.fillStyle = '#f2e3bf';
    ctx.font = `600 40px ${JP_SERIF}`;
    ctx.fillText(nameJP, 149, 73);
    ctx.fillStyle = '#b88d4e';
    ctx.font = `500 15px ${JP_SANS}`;
    ctx.fillText('LOCAL  FOR ' + nameEN.toUpperCase(), 27, 104);
  });
}

export function createCloudTexture() {
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const random = prng(629);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i += 1) {
      const x = 70 + random() * (w - 140);
      const y = 90 + random() * 92;
      const rx = 32 + random() * 82;
      const ry = 20 + random() * 38;
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
      g.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
      g.addColorStop(0.52, 'rgba(255, 252, 244, 0.16)');
      g.addColorStop(1, 'rgba(255, 250, 240, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, random() * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, { colorSpace: THREE.SRGBColorSpace });
}

export function createDappleTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const random = prng(819);
    for (let i = 0; i < 70; i += 1) {
      const x = random() * w;
      const y = random() * h;
      const rx = 6 + random() * 30;
      const ry = 3 + random() * 18;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
      g.addColorStop(0, 'rgba(42, 52, 38, 0.28)');
      g.addColorStop(0.7, 'rgba(42, 52, 38, 0.12)');
      g.addColorStop(1, 'rgba(42, 52, 38, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function createCrossingSignTexture() {
  return canvasTexture(256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#f4efe2';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#38352e';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#bd5747';
    ctx.beginPath();
    ctx.moveTo(48, 38);
    ctx.lineTo(208, 38);
    ctx.lineTo(208, 146);
    ctx.lineTo(128, 196);
    ctx.lineTo(48, 146);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f8f2e5';
    ctx.font = `600 50px ${JP_SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText('踏切', 128, 124);
    ctx.fillStyle = '#433e34';
    ctx.font = `600 16px ${JP_SANS}`;
    ctx.fillText('RAILWAY CROSSING', 128, 240);
    ctx.font = `500 11px ${JP_SANS}`;
    ctx.fillText('立ち入り注意', 128, 267);
    ctx.fillStyle = '#d1b25b';
    ctx.fillRect(28, 288, w - 56, 5);
  });
}

export function createCrossingRoadTexture() {
  return canvasTexture(512, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#565650';
    ctx.fillRect(0, 0, w, h);
    const random = prng(554);
    speckles(ctx, w, h, 4200, random, [0.4, 1.4], ['#262724', '#8b877a', '#b9b2a3']);
    ctx.fillStyle = 'rgba(243, 239, 225, 0.52)';
    ctx.fillRect(46, 0, 8, h * 0.37);
    ctx.fillRect(w - 54, 0, 8, h * 0.37);
    ctx.fillRect(46, h * 0.62, 8, h * 0.38);
    ctx.fillRect(w - 54, h * 0.62, 8, h * 0.38);
    ctx.fillStyle = 'rgba(245, 240, 228, 0.67)';
    for (let y = 30; y < h * 0.36; y += 70) ctx.fillRect(w / 2 - 4, y, 8, 38);
    ctx.save();
    ctx.translate(w / 2, h * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(245, 240, 228, 0.52)';
    ctx.font = `600 42px ${JP_SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('踏　切', 0, 14);
    ctx.restore();
  });
}

export function createTowerAdTexture({ text = 'AONAGI', sub = 'CITY LIFE', bg = '#8a6d52' }) {
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(244, 237, 222, 0.11)';
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.arc(w - 60, 25, 20 + i * 26, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(244, 237, 222, 0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = '#f2e9d7';
    ctx.font = `600 68px ${JP_SERIF}`;
    ctx.fillText(text, 38, 135);
    ctx.font = `600 13px ${JP_SANS}`;
    ctx.fillText(sub, 42, 171);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fillRect(42, 191, 110, 2);
  });
}
