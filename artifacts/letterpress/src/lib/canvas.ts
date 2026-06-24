/* ─── Shared envelope & wax seal canvas drawing ──────────────
   Used by seal.tsx and share.tsx so the visual is identical.
───────────────────────────────────────────────────────────── */

export type EnvType = 'cream' | 'kraft' | 'burgundy' | 'black' | 'floral';
export type SealMode = 'premade' | 'draw' | 'mono';

export const ENV_CONFIGS: Record<EnvType, {
  base: string; flap: string; left: string; right: string; bottom: string; textColor: string;
}> = {
  cream:    { base: '#f0ead0', flap: '#d8ceaa', left: '#e4dabc', right: '#ccc4a0', bottom: '#ddd4b0', textColor: '#3d2b1f' },
  kraft:    { base: '#b07848', flap: '#8a5830', left: '#a06838', right: '#8a5028', bottom: '#906030', textColor: '#2a1508' },
  burgundy: { base: '#6b1a2a', flap: '#3d0d18', left: '#5a1422', right: '#4a0e1a', bottom: '#501018', textColor: '#f0d0c0' },
  black:    { base: '#1a1a1a', flap: '#0a0a0a', left: '#141414', right: '#0e0e0e', bottom: '#101010', textColor: '#c8a030' },
  floral:   { base: '#f0e8d0', flap: '#d8c8a0', left: '#e0d4b8', right: '#d4c4a4', bottom: '#dccca8', textColor: '#3d2b1f' },
};

export function drawWaxSeal(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  waxColor: string, sealMode: SealMode,
  symbol: string, monoText: string,
  drawCanvas: HTMLCanvasElement | null
) {
  ctx.save();
  // Outer blob
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const dr = r + r * 0.15 + Math.sin(i * 2.3) * r * 0.08;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * dr, cy + Math.sin(a) * dr);
    else ctx.lineTo(cx + Math.cos(a) * dr, cy + Math.sin(a) * dr);
  }
  ctx.closePath();
  ctx.fillStyle = waxColor; ctx.globalAlpha = 0.6; ctx.fill();
  ctx.globalAlpha = 1;

  // Main disc
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = waxColor; ctx.fill();

  // Specular highlight
  ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();

  // Content
  const sym = sealMode === 'mono' ? (monoText || '?')
    : sealMode === 'draw' ? null : symbol;

  if (sealMode === 'draw' && drawCanvas) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(drawCanvas, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  } else if (sym) {
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = sealMode === 'mono'
      ? Math.min(r * 0.75, (r * 1.4) / Math.max(sym.length, 1))
      : r * 0.85;
    ctx.font = `${fs}px 'Cormorant Garamond',serif`;
    ctx.fillText(sym, cx, cy);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

export function drawEnvelopeCanvas(
  canvas: HTMLCanvasElement,
  w: number, h: number,
  envType: EnvType,
  withSeal: boolean,
  fromName: string, fromAddr: string,
  toName: string, toAddr: string,
  isOpen: boolean,
  waxColor: string, sealMode: SealMode,
  symbol: string, monoText: string,
  drawCanvas: HTMLCanvasElement | null,
  addrColor = ''
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const cfg = ENV_CONFIGS[envType] || ENV_CONFIGS.cream;

  ctx.clearRect(0, 0, w, h);

  // Base
  ctx.fillStyle = cfg.base;
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 12); ctx.fill();

  // Floral decoration
  if (envType === 'floral') {
    const spots: [number, number, number, string][] = [
      [0.15, 0.2, 14, 'rgba(180,100,120,0.3)'],
      [0.82, 0.18, 11, 'rgba(100,150,80,0.3)'],
      [0.5,  0.82, 12, 'rgba(180,100,120,0.25)'],
      [0.12, 0.7,   9, 'rgba(100,150,80,0.25)'],
      [0.88, 0.65, 10, 'rgba(180,120,80,0.25)'],
    ];
    spots.forEach(([fx, fy, fr, fc]) => {
      ctx.fillStyle = fc;
      ctx.beginPath(); ctx.arc(fx * w, fy * h, fr, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(fx * w + Math.cos(a) * fr * 0.8, fy * h + Math.sin(a) * fr * 0.8, fr * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // Side triangles
  ctx.fillStyle = cfg.left; ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, h); ctx.lineTo(w / 2, h / 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = cfg.right;
  ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(w / 2, h / 2); ctx.closePath(); ctx.fill();

  // Bottom triangle
  ctx.fillStyle = cfg.bottom; ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w, h); ctx.lineTo(w / 2, h / 2); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;

  // Flap (top)
  ctx.fillStyle = cfg.flap;
  if (isOpen) {
    ctx.save();
    ctx.translate(w / 2, 0); ctx.scale(1, -0.6);
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.lineTo(0, h * 0.48); ctx.closePath();
    ctx.fill(); ctx.restore();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w / 2, h * 0.48); ctx.closePath();
    ctx.fill();
  }

  // Border
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 12); ctx.stroke();

  // Address text
  const textCol = addrColor || cfg.textColor;
  if (fromName || fromAddr || toName || toAddr) {
    ctx.globalAlpha = 0.85; ctx.fillStyle = textCol;
    ctx.font = `italic 11px 'Cormorant Garamond',serif`; ctx.textAlign = 'left';
    if (fromName) ctx.fillText(fromName, 16 * w / 260, 20 * h / 173);
    if (fromAddr) ctx.fillText(fromAddr, 16 * w / 260, 34 * h / 173);
    ctx.textAlign = 'right';
    ctx.font = `600 ${13 * w / 260}px 'Cormorant Garamond',serif`;
    if (toName)  ctx.fillText(toName,  w - 16 * w / 260, h * 0.80);
    ctx.font = `italic ${11 * w / 260}px 'Cormorant Garamond',serif`;
    if (toAddr)  ctx.fillText(toAddr,  w - 16 * w / 260, h * 0.80 + 14 * h / 173);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  // Wax seal
  if (withSeal && !isOpen) {
    drawWaxSeal(ctx, w / 2, h / 2, Math.min(w, h) * 0.17, waxColor, sealMode, symbol, monoText, drawCanvas);
  }
}
