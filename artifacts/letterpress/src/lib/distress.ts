/* ─── Paper Distress / Aging System ──────────────────────────
   Renders vintage document effects onto a canvas overlay.
   All effects are deterministic-seeded so they stay consistent
   for the same letter (seed = letterId or 0 for live preview).
───────────────────────────────────────────────────────────── */

export interface DistressSettings {
  foxing:   boolean;
  edges:    boolean;
  burns:    boolean;
  wrinkles: boolean;
  fade:     boolean;
  bleed:    boolean;
  level: number; // 1–5
}

export const defaultDistress: DistressSettings = {
  foxing: false, edges: false, burns: false,
  wrinkles: false, fade: false, bleed: false,
  level: 2,
};

/* Seeded pseudo-random (LCG) for reproducible distress */
function makeRand(seed: number) {
  let s = seed ^ 0xdeadbeef;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return ((s >>> 0) / 0xffffffff);
  };
}

export function drawDistress(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  settings: DistressSettings,
  seed = 42
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const rand = makeRand(seed);
  const lvl = settings.level / 5;

  ctx.clearRect(0, 0, w, h);

  /* ── Foxing spots ───────────────────────────────────────── */
  if (settings.foxing) {
    const count = Math.floor(24 + lvl * 80);
    for (let i = 0; i < count; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 1.5 + rand() * 9 * lvl;
      const alpha = 0.10 + rand() * 0.28 * lvl;
      const hue = 16 + rand() * 26;
      const sat = 38 + rand() * 32;
      const lit = 25 + rand() * 28;
      // Main spot
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `hsla(${hue},${sat}%,${lit}%,${alpha})`);
      g.addColorStop(0.6, `hsla(${hue},${sat - 10}%,${lit + 10}%,${alpha * 0.55})`);
      g.addColorStop(1, `hsla(${hue},${sat}%,${lit}%,0)`);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      // Irregular halo (larger, very faint)
      if (rand() > 0.5) {
        const r2 = r * (1.6 + rand());
        const g2 = ctx.createRadialGradient(x, y, r * 0.5, x, y, r2);
        g2.addColorStop(0, `hsla(${hue},${sat}%,${lit}%,0)`);
        g2.addColorStop(1, `hsla(${hue + 5},${sat}%,${lit}%,${alpha * 0.18})`);
        ctx.beginPath(); ctx.arc(x, y, r2, 0, Math.PI * 2);
        ctx.fillStyle = g2; ctx.fill();
      }
    }
  }

  /* ── Burnt corners ──────────────────────────────────────── */
  if (settings.burns) {
    const corners: [number, number][] = [[0, 0], [w, 0], [0, h], [w, h]];
    corners.forEach(([cx, cy]) => {
      const rSize = Math.max(w, h) * (0.22 + rand() * 0.18) * lvl;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rSize);
      g.addColorStop(0,   `rgba(12,5,1,${0.65 * lvl})`);
      g.addColorStop(0.3, `rgba(25,12,3,${0.42 * lvl})`);
      g.addColorStop(0.65, `rgba(40,20,6,${0.18 * lvl})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    // Slight singed edge tint
    const edgeG = ctx.createLinearGradient(0, 0, 0, h);
    edgeG.addColorStop(0, `rgba(20,8,2,${0.18 * lvl})`);
    edgeG.addColorStop(0.08, 'rgba(0,0,0,0)');
    edgeG.addColorStop(0.92, 'rgba(0,0,0,0)');
    edgeG.addColorStop(1,  `rgba(18,7,1,${0.14 * lvl})`);
    ctx.fillStyle = edgeG; ctx.fillRect(0, 0, w, h);
  }

  /* ── Torn / worn edges ──────────────────────────────────── */
  if (settings.edges) {
    const segments = 4;
    const sides: Array<{ axis: 'x' | 'y'; pos: number; dir: 1 | -1 }> = [
      { axis: 'x', pos: 0,   dir:  1 },
      { axis: 'x', pos: w,   dir: -1 },
      { axis: 'y', pos: 0,   dir:  1 },
      { axis: 'y', pos: h,   dir: -1 },
    ];
    sides.forEach(({ axis, pos, dir }) => {
      const len = axis === 'x' ? h : w;
      const depth = 5 + rand() * 10 * lvl;
      ctx.beginPath();
      if (axis === 'x') {
        ctx.moveTo(pos, 0);
        for (let i = 0; i <= segments * 8; i++) {
          const t = (i / (segments * 8)) * len;
          const jitter = (rand() - 0.5) * depth * 2;
          const torn = rand() > 0.88 ? rand() * depth * 1.5 : rand() * depth * 0.4;
          ctx.lineTo(pos + dir * (torn + Math.abs(jitter * 0.3)), t);
        }
        ctx.lineTo(pos, len);
        ctx.closePath();
      } else {
        ctx.moveTo(0, pos);
        for (let i = 0; i <= segments * 8; i++) {
          const t = (i / (segments * 8)) * len;
          const jitter = (rand() - 0.5) * depth * 2;
          const torn = rand() > 0.88 ? rand() * depth * 1.5 : rand() * depth * 0.4;
          ctx.lineTo(t, pos + dir * (torn + Math.abs(jitter * 0.3)));
        }
        ctx.lineTo(len, pos);
        ctx.closePath();
      }
      ctx.fillStyle = `rgba(160,140,110,${0.35 * lvl})`;
      ctx.fill();
    });
  }

  /* ── Wrinkle lines ──────────────────────────────────────── */
  if (settings.wrinkles) {
    const count = Math.floor(12 + lvl * 35);
    for (let i = 0; i < count; i++) {
      const x1 = rand() * w;
      const y1 = rand() * h;
      const len = 18 + rand() * 80;
      const angle = rand() * Math.PI;
      const alpha = 0.06 + rand() * 0.10 * lvl;
      ctx.strokeStyle = `rgba(140,120,85,${alpha})`;
      ctx.lineWidth = 0.4 + rand() * 0.6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      // Slightly curved wrinkle
      const mx = x1 + Math.cos(angle) * len * 0.5 + (rand() - 0.5) * 12;
      const my = y1 + Math.sin(angle) * len * 0.5 + (rand() - 0.5) * 12;
      ctx.quadraticCurveTo(mx, my, x1 + Math.cos(angle) * len, y1 + Math.sin(angle) * len);
      ctx.stroke();
    }
  }

  /* ── Discoloration / fade overlay ──────────────────────── */
  if (settings.fade) {
    // Uneven yellowing
    const g1 = ctx.createLinearGradient(rand() * w, rand() * h, rand() * w, rand() * h);
    g1.addColorStop(0,   `rgba(210,185,130,${0.13 * lvl})`);
    g1.addColorStop(0.4, 'rgba(0,0,0,0)');
    g1.addColorStop(0.75, `rgba(195,170,110,${0.09 * lvl})`);
    g1.addColorStop(1,   `rgba(180,155,95,${0.17 * lvl})`);
    ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);
    // Small aged blotches
    const count2 = Math.floor(4 + lvl * 14);
    for (let i = 0; i < count2; i++) {
      const x = rand() * w; const y = rand() * h;
      const rr = 15 + rand() * 55 * lvl;
      const g2 = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g2.addColorStop(0, `rgba(185,160,100,${0.12 * lvl})`);
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2; ctx.fillRect(Math.max(0, x - rr), Math.max(0, y - rr), rr * 2, rr * 2);
    }
  }
}

/* ── CSS filter string for ink bleed effect ─────────────── */
export function bleedFilter(settings: DistressSettings): string {
  if (!settings.bleed) return 'none';
  const lvl = settings.level / 5;
  // Blur + contrast hack for ink spread illusion
  return `blur(${0.4 + lvl * 0.7}px) contrast(${1 - lvl * 0.06})`;
}

/* ── Serialize / deserialize distress for URL params ──── */
const KEYS = ['foxing', 'edges', 'burns', 'wrinkles', 'fade', 'bleed'] as const;

export function distressToParams(s: DistressSettings): string {
  const active = KEYS.filter(k => s[k]);
  const p = new URLSearchParams();
  if (active.length) p.set('fx', active.join(','));
  p.set('lvl', String(s.level));
  return p.toString();
}

export function distressFromParams(search: string): DistressSettings {
  const p = new URLSearchParams(search);
  const fx = (p.get('fx') || '').split(',');
  const level = Math.max(1, Math.min(5, parseInt(p.get('lvl') || '2') || 2));
  return {
    foxing:   fx.includes('foxing'),
    edges:    fx.includes('edges'),
    burns:    fx.includes('burns'),
    wrinkles: fx.includes('wrinkles'),
    fade:     fx.includes('fade'),
    bleed:    fx.includes('bleed'),
    level,
  };
}

/* ── CSS for bleed on text (injected as <style> tag) ────── */
export function bleedStyle(settings: DistressSettings, selector: string): string {
  if (!settings.bleed) return '';
  const lvl = settings.level / 5;
  return `${selector}{filter:blur(${0.35 + lvl * 0.6}px) contrast(${1 - lvl * 0.05});}`;
}
