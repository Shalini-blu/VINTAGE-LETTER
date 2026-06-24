import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import {
  useGetLetter,
  useUpdateLetter,
  useShareLetter,
  getGetLetterQueryKey,
  getListLettersQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { playWaxStamp, playEnvelopeOpen, playButtonClick, resumeAudio } from '@/lib/sounds';
import { getDistressSettings } from '@/lib/storage';
import { distressToParams, type DistressSettings } from '@/lib/distress';

/* ─── HTML Export ────────────────────────────────────────────── */
function eh(s: string) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function generateLetterHTML(params: {
  title: string; content: string; font: string; inkColor: string;
  paperTexture: string; senderName: string; recipientName: string;
  envelopeDataUrl: string; distress?: DistressSettings;
}) {
  const paperBg: Record<string, string> = {
    plain: '#f5f0e0', lined: '#f5f0e0', aged: '#e8d9b5', parchment: '#d4c090', graph: '#f0eedc',
  };
  const bg = paperBg[params.paperTexture] || '#f5f0e0';
  const paperLines = params.paperTexture === 'lined'
    ? `repeating-linear-gradient(transparent,transparent 31px,rgba(200,180,150,0.45) 31px,rgba(200,180,150,0.45) 32px)`
    : 'none';
  const d = params.distress;
  const lvl = d ? d.level / 5 : 0;
  const bleedStyle = d?.bleed ? `filter:blur(${0.28 + lvl * 0.52}px) contrast(${1 - lvl * 0.04});` : '';
  // Inline distress canvas script
  const distressScript = d && (d.foxing || d.burns || d.fade || d.wrinkles || d.edges) ? `
<script>
(function(){
  var s=${JSON.stringify({ foxing: d.foxing, burns: d.burns, fade: d.fade, wrinkles: d.wrinkles, edges: d.edges, level: d.level })};
  var lvl=s.level/5;
  function mkRand(seed){var x=seed^0xdeadbeef;return function(){x=(Math.imul(x,1664525)+1013904223)|0;return((x>>>0)/0xffffffff);};}
  function draw(){
    var el=document.querySelector('.paper');if(!el)return;
    var c=document.createElement('canvas');
    c.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:multiply;';
    el.appendChild(c);
    var w=el.offsetWidth,h=el.offsetHeight;c.width=w;c.height=h;
    var ctx=c.getContext('2d'),rand=mkRand(42);
    if(s.foxing){var n=Math.floor(24+lvl*80);for(var i=0;i<n;i++){var px=rand()*w,py=rand()*h,r=1.5+rand()*9*lvl,a=0.10+rand()*0.28*lvl,hh=16+rand()*26,sa=38+rand()*32,li=25+rand()*28;var g=ctx.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'hsla('+hh+','+sa+'%,'+li+'%,'+a+')');g.addColorStop(1,'rgba(0,0,0,0)');ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();}}
    if(s.burns){[[0,0],[w,0],[0,h],[w,h]].forEach(function(c2){var g=ctx.createRadialGradient(c2[0],c2[1],0,c2[0],c2[1],Math.max(w,h)*(0.22+rand()*0.18)*lvl);g.addColorStop(0,'rgba(12,5,1,'+(0.65*lvl)+')');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);});}
    if(s.fade){var g2=ctx.createLinearGradient(0,0,w,h);g2.addColorStop(0,'rgba(210,185,130,'+(0.13*lvl)+')');g2.addColorStop(0.5,'rgba(0,0,0,0)');g2.addColorStop(1,'rgba(180,155,95,'+(0.17*lvl)+')');ctx.fillStyle=g2;ctx.fillRect(0,0,w,h);}
    if(s.wrinkles){var n2=Math.floor(12+lvl*35);for(var i2=0;i2<n2;i2++){ctx.strokeStyle='rgba(140,120,85,'+(0.06+rand()*0.10*lvl)+')';ctx.lineWidth=0.4+rand()*0.6;var x1=rand()*w,y1=rand()*h,len=18+rand()*80,ang=rand()*Math.PI;ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo(x1+Math.cos(ang)*len*0.5+(rand()-0.5)*12,y1+Math.sin(ang)*len*0.5+(rand()-0.5)*12,x1+Math.cos(ang)*len,y1+Math.sin(ang)*len);ctx.stroke();}}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(draw,350)});
  else setTimeout(draw,350);
})();
<\/script>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${eh(params.title) || 'A Letter'}</title>
<link href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=IM+Fell+English:ital@0;1&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;background:linear-gradient(160deg,#3d2410,#1a0d04 50%,#2a1508);display:flex;align-items:center;justify-content:center;padding:24px;font-family:'Special Elite',cursive}
.scene{max-width:520px;width:100%}
.env-wrap{cursor:pointer;transition:transform 0.25s,filter 0.25s}
.env-wrap:hover{transform:translateY(-6px);filter:drop-shadow(0 16px 40px rgba(0,0,0,0.7))}
.env-wrap img{width:100%;border-radius:14px;box-shadow:0 14px 60px rgba(0,0,0,0.8),0 0 0 1px rgba(200,160,70,0.2);display:block}
.hint{margin-top:12px;text-align:center;font-size:10px;color:#6a5830;letter-spacing:2.5px;text-transform:uppercase;animation:pulse 2.5s ease-in-out infinite}
.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.88);align-items:center;justify-content:center;padding:24px;cursor:pointer;backdrop-filter:blur(10px)}
.overlay.open{display:flex;animation:fadeIn 0.35s ease}
.paper{background:${bg};background-image:${paperLines};max-width:620px;width:100%;max-height:88vh;overflow-y:auto;border-radius:3px;padding:52px 60px 52px 68px;animation:popIn 0.45s cubic-bezier(0.34,1.56,0.64,1);cursor:auto;position:relative;box-shadow:0 28px 90px rgba(0,0,0,0.75),inset 0 0 0 1px rgba(180,150,100,0.3)}
.holes{position:absolute;left:16px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:space-evenly;padding:40px 0;pointer-events:none}
.hole{width:11px;height:11px;border-radius:50%;background:rgba(0,0,0,0.09);border:1px solid rgba(0,0,0,0.07)}
.margin{position:absolute;left:38px;top:0;bottom:0;width:1px;background:rgba(180,80,80,0.22);pointer-events:none}
.close-btn{position:absolute;top:14px;right:14px;background:none;border:none;cursor:pointer;font-size:18px;color:rgba(80,50,20,0.3);line-height:1;padding:6px 10px;transition:color 0.2s}
.close-btn:hover{color:rgba(80,50,20,0.6)}
.letter-title{font-family:${params.font||"'Courier Prime',monospace"};color:${params.inkColor||'#1a0f05'};font-size:20px;font-weight:700;margin-bottom:10px;letter-spacing:0.5px;${bleedStyle}}
.letter-meta{display:flex;gap:20px;margin-bottom:22px;padding-bottom:12px;border-bottom:1px solid rgba(0,0,0,0.09)}
.letter-meta span{font-size:11px;color:rgba(80,50,20,0.45);font-family:'Special Elite',cursive;letter-spacing:0.5px}
.letter-body{font-family:${params.font||"'Courier Prime',monospace"};color:${params.inkColor||'#1a0f05'};font-size:15px;line-height:2em;white-space:pre-wrap;${bleedStyle}}
.letter-sig{margin-top:36px;font-size:14px;font-style:italic;opacity:0.6;font-family:${params.font||"'Courier Prime',monospace"};color:${params.inkColor||'#1a0f05'};${bleedStyle}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes popIn{from{opacity:0;transform:translateY(50px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}
</style>
</head>
<body>
<div class="scene">
  <div class="env-wrap" onclick="open_()">
    <img src="${params.envelopeDataUrl}" alt="Sealed envelope">
    <div class="hint">✦ Click the wax seal to open ✦</div>
  </div>
</div>
<div class="overlay" id="ov" onclick="close_()">
  <div class="paper" onclick="event.stopPropagation()">
    <div class="holes"><div class="hole"></div><div class="hole"></div><div class="hole"></div></div>
    <div class="margin"></div>
    <button class="close-btn" onclick="close_()">✕</button>
    ${params.title ? `<div class="letter-title">${eh(params.title)}</div>` : ''}
    ${(params.senderName||params.recipientName) ? `<div class="letter-meta">${params.senderName?`<span>From: ${eh(params.senderName)}</span>`:''} ${params.recipientName?`<span>To: ${eh(params.recipientName)}</span>`:''}</div>` : ''}
    <div class="letter-body">${eh(params.content)}</div>
    ${params.senderName ? `<div class="letter-sig">— ${eh(params.senderName)}</div>` : ''}
  </div>
</div>
<script>
function open_(){document.getElementById('ov').classList.add('open')}
function close_(){document.getElementById('ov').classList.remove('open')}
document.addEventListener('keydown',function(e){if(e.key==='Escape')close_()})
<\/script>
${distressScript}
</body>
</html>`;
}

type EnvType = 'cream' | 'kraft' | 'burgundy' | 'black' | 'floral';
type Panel = 'envelope' | 'seal' | 'send';

const ENV_CONFIGS: Record<EnvType, { base: string; flap: string; left: string; right: string; bottom: string; textColor: string }> = {
  cream:    { base: '#f0ead0', flap: '#d8ceaa', left: '#e4dabc', right: '#ccc4a0', bottom: '#ddd4b0', textColor: '#3d2b1f' },
  kraft:    { base: '#b07848', flap: '#8a5830', left: '#a06838', right: '#8a5028', bottom: '#906030', textColor: '#2a1508' },
  burgundy: { base: '#6b1a2a', flap: '#3d0d18', left: '#5a1422', right: '#4a0e1a', bottom: '#501018', textColor: '#f0d0c0' },
  black:    { base: '#1a1a1a', flap: '#0a0a0a', left: '#141414', right: '#0e0e0e', bottom: '#101010', textColor: '#c8a030' },
  floral:   { base: '#f0e8d0', flap: '#d8c8a0', left: '#e0d4b8', right: '#d4c4a4', bottom: '#dccca8', textColor: '#3d2b1f' },
};

const ENV_PREVIEWS: Record<EnvType, { bg: string; flap: string }> = {
  cream:    { bg: 'linear-gradient(160deg,#f5f0e0,#e8dfc0)', flap: 'rgba(180,160,100,0.4)' },
  kraft:    { bg: 'linear-gradient(160deg,#c4905a,#a07040)', flap: 'rgba(80,40,10,0.25)' },
  burgundy: { bg: 'linear-gradient(160deg,#6b1a2a,#8b2a3a)', flap: 'rgba(30,5,10,0.4)' },
  black:    { bg: 'linear-gradient(160deg,#1a1a1a,#0d0d0d)', flap: 'rgba(255,255,255,0.05)' },
  floral:   { bg: '#f0e8d0', flap: 'rgba(180,120,100,0.2)' },
};

const WAX_COLORS = [
  { style: 'radial-gradient(circle at 35% 35%,#d44,#8b0000)', value: '#c01010' },
  { style: 'radial-gradient(circle at 35% 35%,#b08050,#6b3820)', value: '#8b4513' },
  { style: 'radial-gradient(circle at 35% 35%,#222,#000)', value: '#111' },
  { style: 'radial-gradient(circle at 35% 35%,#3a6aaa,#1a3a6a)', value: '#1a4080' },
  { style: 'radial-gradient(circle at 35% 35%,#ddb030,#8b6010)', value: '#c89020' },
  { style: 'radial-gradient(circle at 35% 35%,#6a3a8a,#3a1a5a)', value: '#4a1a7a' },
  { style: 'radial-gradient(circle at 35% 35%,#3a8a4a,#1a4a2a)', value: '#1a5a2a' },
  { style: 'radial-gradient(circle at 35% 35%,#eee,#bbb)', value: '#c8c8c8' },
];

const ADDR_COLORS = [
  { label: 'Auto',    value: '' },
  { label: 'Ink',     value: '#1a0f05' },
  { label: 'Gold',    value: '#c8a030' },
  { label: 'Cream',   value: '#f0ead0' },
  { label: 'Silver',  value: '#b0b8c0' },
  { label: 'Crimson', value: '#7a1010' },
  { label: 'Forest',  value: '#1a3a1a' },
  { label: 'Navy',    value: '#1a1a4a' },
];

const STAMPS = ['✦','❧','⚜','☽','✿','⚔','♛','✉','❋','⚘','☸','✵'];

type SealMode = 'premade' | 'draw' | 'mono';

function drawWaxSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, waxColor: string, sealMode: SealMode, symbol: string, monoText: string, drawCanvas: HTMLCanvasElement | null) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const dr = r + r * 0.15 + Math.sin(i * 2.3) * r * 0.08;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * dr, cy + Math.sin(a) * dr);
    else ctx.lineTo(cx + Math.cos(a) * dr, cy + Math.sin(a) * dr);
  }
  ctx.closePath(); ctx.fillStyle = waxColor; ctx.globalAlpha = 0.6; ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = waxColor; ctx.fill();
  ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.35, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
  const sym = sealMode === 'mono' ? (monoText || '?') : (sealMode === 'draw' ? null : symbol);
  if (sealMode === 'draw' && drawCanvas) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(drawCanvas, cx - r, cy - r, r * 2, r * 2); ctx.restore();
  } else if (sym) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = sealMode === 'mono' ? Math.min(r * 0.75, r * 1.4 / Math.max(sym.length, 1)) : r * 0.85;
    ctx.font = `${fs}px 'Cormorant Garamond',serif`; ctx.fillText(sym, cx, cy);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

function drawEnvelopeCanvas(
  canvas: HTMLCanvasElement, w: number, h: number,
  envType: EnvType, withSeal: boolean, fromName: string, fromAddr: string, toName: string, toAddr: string, isOpen: boolean,
  waxColor: string, sealMode: SealMode, symbol: string, monoText: string, drawCanvas: HTMLCanvasElement | null,
  addrColor?: string
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const cfg = ENV_CONFIGS[envType] || ENV_CONFIGS.cream;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = cfg.base;
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 12); ctx.fill();

  if (envType === 'floral') {
    [[0.15,0.2,14,'rgba(180,100,120,0.3)'],[0.82,0.18,11,'rgba(100,150,80,0.3)'],[0.5,0.82,12,'rgba(180,100,120,0.25)'],[0.12,0.7,9,'rgba(100,150,80,0.25)'],[0.88,0.65,10,'rgba(180,120,80,0.25)']].forEach(([fx,fy,fr,fc]) => {
      ctx.fillStyle = fc as string; ctx.beginPath(); ctx.arc(Number(fx)*w, Number(fy)*h, Number(fr), 0, Math.PI*2); ctx.fill();
      for (let i = 0; i < 5; i++) { const a = (i/5)*Math.PI*2; ctx.beginPath(); ctx.arc(Number(fx)*w+Math.cos(a)*Number(fr)*0.8, Number(fy)*h+Math.sin(a)*Number(fr)*0.8, Number(fr)*0.4, 0, Math.PI*2); ctx.fill(); }
    });
  }

  ctx.fillStyle = cfg.left; ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,h); ctx.lineTo(w/2,h/2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = cfg.right;
  ctx.beginPath(); ctx.moveTo(w,0); ctx.lineTo(w,h); ctx.lineTo(w/2,h/2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = cfg.bottom; ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.moveTo(0,h); ctx.lineTo(w,h); ctx.lineTo(w/2,h/2); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1; ctx.fillStyle = cfg.flap;

  if (isOpen) {
    ctx.save(); ctx.translate(w/2, 0); ctx.scale(1, -0.6);
    ctx.beginPath(); ctx.moveTo(-w/2,0); ctx.lineTo(w/2,0); ctx.lineTo(0,h*0.48); ctx.closePath(); ctx.fill();
    ctx.restore();
  } else {
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(w,0); ctx.lineTo(w/2,h*0.48); ctx.closePath(); ctx.fill();
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(0,0,w,h,12); ctx.stroke();

  const textCol = (addrColor && addrColor !== '') ? addrColor : cfg.textColor;

  if (fromName || fromAddr || toName || toAddr) {
    ctx.globalAlpha = 0.85; ctx.fillStyle = textCol;

    // From — top left
    ctx.font = `italic 11px 'Cormorant Garamond',serif`; ctx.textAlign = 'left';
    if (fromName) ctx.fillText(fromName, 16*w/260, 20*h/173);
    if (fromAddr) ctx.fillText(fromAddr, 16*w/260, 34*h/173);

    // To — bottom right
    ctx.textAlign = 'right';
    ctx.font = `600 ${13*w/260}px 'Cormorant Garamond',serif`;
    if (toName) ctx.fillText(toName, w - 16*w/260, h*0.80);
    ctx.font = `italic ${11*w/260}px 'Cormorant Garamond',serif`;
    if (toAddr) ctx.fillText(toAddr, w - 16*w/260, h*0.80 + 14*h/173);

    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  if (withSeal && !isOpen) {
    drawWaxSeal(ctx, w/2, h/2, Math.min(w,h)*0.17, waxColor, sealMode, symbol, monoText, drawCanvas);
  }
}

export default function Seal() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const id = parseInt(params.id, 10);

  const { data: letter } = useGetLetter(id, {
    query: { enabled: !!id, queryKey: getGetLetterQueryKey(id) },
  });
  const updateLetter = useUpdateLetter();
  const shareLetter = useShareLetter();

  const [panel, setPanel] = useState<Panel>('envelope');
  const [envType, setEnvType] = useState<EnvType>('cream');
  const [fromName, setFromName] = useState('');
  const [fromAddr, setFromAddr] = useState('');
  const [toName, setToName] = useState('');
  const [toAddr, setToAddr] = useState('');
  const [addrColor, setAddrColor] = useState('');
  const [waxColor, setWaxColor] = useState('#c01010');
  const [symbol, setSymbol] = useState('✦');
  const [sealMode, setSealMode] = useState<SealMode>('premade');
  const [monoText, setMonoText] = useState('');
  const [letterOpen, setLetterOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const envLargeRef = useRef<HTMLCanvasElement>(null);
  const sealPreviewRef = useRef<HTMLCanvasElement>(null);
  const envWithSealRef = useRef<HTMLCanvasElement>(null);
  const finalEnvRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const hasDrawDataRef = useRef(false);

  useEffect(() => {
    if (letter) {
      setFromName(letter.senderName || '');
      setToName(letter.recipientName || '');
      setEnvType((letter.envelopeStyle as EnvType) || 'cream');
      setWaxColor(letter.waxSealColor || '#c01010');
      setSymbol(letter.waxSealSymbol || '✦');
    }
  }, [letter]);

  const getDrawCanvas = () => sealMode === 'draw' && hasDrawDataRef.current ? drawCanvasRef.current : null;

  const renderEnvLarge = useCallback(() => {
    if (!envLargeRef.current) return;
    drawEnvelopeCanvas(envLargeRef.current, 260, 173, envType, false, fromName, fromAddr, toName, toAddr, false, waxColor, sealMode, symbol, monoText, getDrawCanvas(), addrColor);
  }, [envType, fromName, fromAddr, toName, toAddr, waxColor, sealMode, symbol, monoText, addrColor]);

  const renderSealPreview = useCallback(() => {
    if (!sealPreviewRef.current) return;
    const c = sealPreviewRef.current;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0,0,160,160);
    const cx=80,cy=80,r=60;
    ctx.save();
    ctx.beginPath();
    for (let i=0;i<16;i++){const a=(i/16)*Math.PI*2,dr=r+7+Math.sin(i*2.1+0.5)*5;if(i===0)ctx.moveTo(cx+Math.cos(a)*dr,cy+Math.sin(a)*dr);else ctx.lineTo(cx+Math.cos(a)*dr,cy+Math.sin(a)*dr);}
    ctx.closePath(); ctx.fillStyle=waxColor; ctx.globalAlpha=0.55; ctx.fill();
    ctx.globalAlpha=1;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=waxColor; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy,r-3,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx-18,cy-18,20,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fill();
    const sym = sealMode==='mono'?(monoText||'?'):(sealMode==='draw'?null:symbol);
    if(sealMode==='draw'&&hasDrawDataRef.current&&drawCanvasRef.current){ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();ctx.drawImage(drawCanvasRef.current,cx-r,cy-r,r*2,r*2);ctx.restore();}
    else if(sym){ctx.fillStyle='rgba(255,255,255,0.82)';ctx.textAlign='center';ctx.textBaseline='middle';const fs=sealMode==='mono'?Math.min(44,54/Math.max(sym.length,1)):44;ctx.font=`${fs}px 'Cormorant Garamond',serif`;ctx.fillText(sym,cx,cy);ctx.textBaseline='alphabetic';}
    ctx.restore();
    if (envWithSealRef.current) {
      drawEnvelopeCanvas(envWithSealRef.current, 260, 173, envType, true, '', '', '', '', false, waxColor, sealMode, symbol, monoText, getDrawCanvas(), addrColor);
    }
  }, [waxColor, sealMode, symbol, monoText, envType, addrColor]);

  const renderFinal = useCallback(() => {
    if (!finalEnvRef.current) return;
    drawEnvelopeCanvas(finalEnvRef.current, 520, 346, envType, true, fromName, fromAddr, toName, toAddr, false, waxColor, sealMode, symbol, monoText, getDrawCanvas(), addrColor);
  }, [envType, fromName, fromAddr, toName, toAddr, waxColor, sealMode, symbol, monoText, addrColor]);

  useEffect(() => { renderEnvLarge(); }, [renderEnvLarge]);
  useEffect(() => { renderSealPreview(); }, [renderSealPreview]);
  useEffect(() => { if (panel === 'send') renderFinal(); }, [renderFinal, panel]);

  const setupDrawCanvas = useCallback(() => {
    if (!drawCanvasRef.current) return;
    const ctx = drawCanvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0,0,120,120);
    ctx.fillStyle = waxColor;
    ctx.beginPath(); ctx.arc(60,60,58,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  }, [waxColor]);

  useEffect(() => {
    if (sealMode === 'draw') setupDrawCanvas();
  }, [sealMode, setupDrawCanvas]);

  const showToast = (msg: string) => {
    setToast(msg); setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const goToPanel = (p: Panel) => {
    setPanel(p);
    window.scrollTo(0,0);
  };

  const handleSealAndPreview = async () => {
    playWaxStamp();
    setIsSaving(true);
    await updateLetter.mutateAsync({
      id,
      data: { envelopeStyle: envType, waxSealColor: waxColor, waxSealSymbol: symbol, recipientName: toName, senderName: fromName, status: 'completed' },
    });
    queryClient.invalidateQueries({ queryKey: getGetLetterQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListLettersQueryKey() });
    setIsSaving(false);
    goToPanel('send');
  };

  const handleCopyLink = async () => {
    resumeAudio();
    const result = await shareLetter.mutateAsync({ id });
    const distressSettings = getDistressSettings(id);
    const dq = distressSettings ? distressToParams(distressSettings) : '';
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const shareUrl = `${window.location.origin}${base}/share/${result.token}${dq ? '?' + dq : ''}`;
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    queryClient.invalidateQueries({ queryKey: getGetLetterQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListLettersQueryKey() });
    setCopied(true);
    showToast('Share link copied!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownload = () => {
    if (!letter || !finalEnvRef.current) return;
    resumeAudio();
    const dataUrl = finalEnvRef.current.toDataURL('image/png');
    const distressSettings = getDistressSettings(id) || undefined;
    const html = generateLetterHTML({
      title: letter.title || '',
      content: letter.content || '',
      font: letter.font || "'Courier Prime',monospace",
      inkColor: letter.inkColor || '#1a0f05',
      paperTexture: letter.paperTexture || 'plain',
      senderName: letter.senderName || fromName,
      recipientName: letter.recipientName || toName,
      envelopeDataUrl: dataUrl,
      distress: distressSettings,
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = `${letter.title || 'letter'}.html`;
    a.click();
    showToast('Letter exported as HTML!');
  };

  const handleEmail = () => {
    if (!letter) return;
    window.open(`mailto:${letter.recipientEmail||''}?subject=${encodeURIComponent(letter.title||'A letter for you')}&body=${encodeURIComponent(letter.content||'')}`, '_blank');
  };

  const handleDrawMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const r = drawCanvasRef.current!.getBoundingClientRect();
    const ctx = drawCanvasRef.current!.getContext('2d')!;
    ctx.beginPath(); ctx.moveTo(e.clientX-r.left, e.clientY-r.top);
  };
  const handleDrawMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !drawCanvasRef.current) return;
    const r = drawCanvasRef.current.getBoundingClientRect();
    const ctx = drawCanvasRef.current.getContext('2d')!;
    ctx.lineTo(e.clientX-r.left, e.clientY-r.top); ctx.stroke();
    hasDrawDataRef.current = true;
    renderSealPreview();
  };
  const handleDrawMouseUp = () => { isDrawingRef.current = false; };

  const panelOrder: Panel[] = ['envelope','seal','send'];
  const panelIdx = panelOrder.indexOf(panel);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'linear-gradient(135deg,#8a6010,#c8a030)' : 'none',
    border: `1px solid ${active ? 'transparent' : 'rgba(200,160,70,0.3)'}`,
    color: active ? '#1a0f05' : '#c8a030',
    padding: active ? '11px 28px' : '10px 24px',
    borderRadius: '8px', fontFamily: "'Special Elite',cursive",
    fontSize: active ? '14px' : '13px', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.5px',
  });

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,160,70,0.2)',
    borderRadius: '6px', padding: '8px 12px', color: '#e8d5a0',
    fontFamily: "'Cormorant Garamond',serif", fontSize: '15px', outline: 'none', width: '100%',
  };

  return (
    <div style={{ background: '#1a1008', minHeight: '100vh', fontFamily: "'Special Elite', cursive", color: '#c8a030' }}>

      <style>{`
        @keyframes modalIn { from { opacity:0; transform:scale(0.88) translateY(30px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes overlayIn { from { opacity:0; } to { opacity:1; } }
        @keyframes waxDrip { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Toast */}
      <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: `translateX(-50%) translateY(${toastVisible ? '0' : '60px'})`, background: '#c8a030', color: '#1a0f05', padding: '10px 24px', borderRadius: '8px', fontFamily: "'Special Elite',cursive", fontSize: '13px', transition: 'transform 0.3s', zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
        {toast}
      </div>

      {/* Letter modal */}
      {letterOpen && letter && (
        <div
          onClick={() => setLetterOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'overlayIn 0.25s ease', backdropFilter: 'blur(6px)', cursor: 'pointer' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '620px', width: '100%', maxHeight: '80vh', overflowY: 'auto', background: '#f5f0e0', backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 31px,rgba(200,180,150,0.4) 31px,rgba(200,180,150,0.4) 32px)', borderRadius: '4px', padding: '48px 56px', boxShadow: '0 24px 80px rgba(0,0,0,0.8)', position: 'relative', animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)', cursor: 'auto' }}
          >
            {/* Paper holes */}
            <div style={{ position: 'absolute', left: '16px', top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: '40px 0' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.07)' }} />)}
            </div>
            {/* Red margin */}
            <div style={{ position: 'absolute', left: '36px', top: 0, bottom: 0, width: '1px', background: 'rgba(180,80,80,0.2)' }} />
            {/* Close */}
            <button
              onClick={() => setLetterOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'rgba(80,50,20,0.4)', lineHeight: 1, padding: '4px 8px' }}
              title="Close"
            >
              ✕
            </button>

            <div style={{ fontFamily: letter.font || "'Courier Prime',monospace", color: letter.inkColor || '#1a0f05', fontSize: '18px', fontWeight: 700, marginBottom: '6px', letterSpacing: '0.5px' }}>
              {letter.title || 'Untitled'}
            </div>
            {(letter.senderName || letter.recipientName) && (
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '12px' }}>
                {letter.senderName && <div style={{ fontSize: '11px', color: 'rgba(80,50,20,0.5)', fontFamily: "'Special Elite',cursive", letterSpacing: '0.5px' }}>From: {letter.senderName}</div>}
                {letter.recipientName && <div style={{ fontSize: '11px', color: 'rgba(80,50,20,0.5)', fontFamily: "'Special Elite',cursive", letterSpacing: '0.5px' }}>To: {letter.recipientName}</div>}
              </div>
            )}
            <div style={{ fontFamily: letter.font || "'Courier Prime',monospace", color: letter.inkColor || '#1a0f05', fontSize: '15px', lineHeight: '2em', whiteSpace: 'pre-wrap' }}>
              {letter.content || ''}
            </div>
            {letter.senderName && (
              <div style={{ marginTop: '32px', fontSize: '14px', opacity: 0.6, fontFamily: letter.font || "'Courier Prime',monospace", color: letter.inkColor || '#1a0f05', fontStyle: 'italic' }}>
                — {letter.senderName}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px 20px 14px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(200,160,70,0.15)' }}>
        {(['Write','Envelope','Wax Seal','Send'] as const).map((label, i) => {
          const isDone = i === 0 || (i === 1 && panelIdx > 0) || (i === 2 && panelIdx > 1);
          const isActive = (i === 1 && panel === 'envelope') || (i === 2 && panel === 'seal') || (i === 3 && panel === 'send');
          const color = isDone ? '#8a7040' : isActive ? '#c8a030' : '#5a4830';
          return (
            <React.Fragment key={label}>
              {i > 0 && <div style={{ color: '#3a2c18', margin: '0 12px', fontSize: '14px' }}>›</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color, transition: 'color 0.3s' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `1px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', background: isDone ? color : isActive ? color : 'transparent', color: (isDone || isActive) ? '#1a1008' : color }}>
                  {isDone && i > 0 ? '✓' : i === 0 ? '✓' : i}
                </div>
                <span>{label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* ====== PANEL: ENVELOPE ====== */}
      {panel === 'envelope' && (
        <div style={{ padding: '24px 20px', maxWidth: '780px', margin: '0 auto' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '22px', fontStyle: 'italic', color: '#c8a030', textAlign: 'center', marginBottom: '6px', letterSpacing: '1px' }}>Choose Your Envelope</div>
          <div style={{ fontSize: '11px', color: '#6a5830', textAlign: 'center', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '28px' }}>Select a style that matches your letter's spirit</div>

          {/* Envelope grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '30px' }}>
            {(['cream','kraft','burgundy','black','floral'] as EnvType[]).map(e => (
              <div
                key={e}
                onClick={() => setEnvType(e)}
                style={{ cursor: 'pointer', borderRadius: '10px', padding: '10px 6px 8px', border: `1.5px solid ${envType === e ? '#c8a030' : 'transparent'}`, transition: 'all 0.2s', textAlign: 'center', background: envType === e ? 'rgba(200,160,70,0.08)' : 'rgba(255,255,255,0.03)' }}
              >
                <div style={{ width: '100%', aspectRatio: '1.6', borderRadius: '6px', position: 'relative', overflow: 'hidden', marginBottom: '8px', background: ENV_PREVIEWS[e].bg }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', clipPath: 'polygon(0 0,100% 0,50% 100%)', background: ENV_PREVIEWS[e].flap }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', clipPath: 'polygon(0 100%,100% 100%,50% 0%)', opacity: 0.15, background: 'rgba(0,0,0,0.3)' }} />
                </div>
                <div style={{ fontSize: '10px', letterSpacing: '1px', color: envType === e ? '#c8a030' : '#8a7040', textTransform: 'uppercase' }}>{e}</div>
              </div>
            ))}
          </div>

          {/* Address + canvas preview */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '20px' }}>
            <canvas ref={envLargeRef} width={260} height={173} style={{ borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: '#6a5830', textTransform: 'uppercase', marginBottom: '4px' }}>From</div>
                <input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Your name" style={inputStyle} />
                <input value={fromAddr} onChange={e => setFromAddr(e.target.value)} placeholder="Your address" style={{ ...inputStyle, marginTop: '6px' }} />
              </div>
              <div>
                <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: '#6a5830', textTransform: 'uppercase', marginBottom: '4px' }}>To</div>
                <input value={toName} onChange={e => setToName(e.target.value)} placeholder="Recipient's name" style={inputStyle} />
                <input value={toAddr} onChange={e => setToAddr(e.target.value)} placeholder="Recipient's address" style={{ ...inputStyle, marginTop: '6px' }} />
              </div>
            </div>
          </div>

          {/* Address text colour */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(200,160,70,0.15)', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#8a7040', marginBottom: '12px' }}>Address Text Colour</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {ADDR_COLORS.map(ac => {
                const isSelected = addrColor === ac.value;
                return (
                  <div
                    key={ac.value}
                    onClick={() => setAddrColor(ac.value)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: ac.value === '' ? 'linear-gradient(135deg,#c8a030 50%,#3d2b1f 50%)' : ac.value,
                      border: `2px solid ${isSelected ? '#c8a030' : 'rgba(200,160,70,0.2)'}`,
                      transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                      transition: 'all 0.18s',
                      boxShadow: isSelected ? '0 0 0 2px rgba(200,160,70,0.4)' : 'none',
                    }} />
                    <span style={{ fontSize: '9px', color: isSelected ? '#c8a030' : '#6a5830', letterSpacing: '0.5px', fontFamily: "'Special Elite',cursive" }}>{ac.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid rgba(200,160,70,0.1)' }}>
            <button onClick={() => setLocation(`/write/${id}`)} style={btnStyle(false)}>← Back to Letter</button>
            <button onClick={() => goToPanel('seal')} style={btnStyle(true)}>Next: Wax Seal →</button>
          </div>
        </div>
      )}

      {/* ====== PANEL: SEAL ====== */}
      {panel === 'seal' && (
        <div style={{ padding: '24px 20px', maxWidth: '780px', margin: '0 auto' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '22px', fontStyle: 'italic', color: '#c8a030', textAlign: 'center', marginBottom: '6px', letterSpacing: '1px' }}>Apply Your Wax Seal</div>
          <div style={{ fontSize: '11px', color: '#6a5830', textAlign: 'center', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '28px' }}>Choose your wax colour and stamp design</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(200,160,70,0.15)', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#8a7040', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid rgba(200,160,70,0.1)' }}>Wax Colour</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {WAX_COLORS.map(wc => (
                    <div
                      key={wc.value}
                      onClick={() => setWaxColor(wc.value)}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', border: `2px solid ${waxColor === wc.value ? '#c8a030' : 'transparent'}`, transform: waxColor === wc.value ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.2s', background: wc.style, position: 'relative' }}
                    >
                      <div style={{ position: 'absolute', inset: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#8a7040', marginBottom: '10px', paddingTop: '8px', borderTop: '1px solid rgba(200,160,70,0.1)' }}>Stamp Design</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  {(['premade','draw','mono'] as SealMode[]).map(m => (
                    <div
                      key={m}
                      onClick={() => setSealMode(m)}
                      style={{ flex: 1, padding: '7px', textAlign: 'center', background: sealMode === m ? 'rgba(200,160,70,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${sealMode === m ? '#c8a030' : 'rgba(200,160,70,0.15)'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', color: sealMode === m ? '#c8a030' : '#6a5830', textTransform: 'uppercase', transition: 'all 0.2s', fontFamily: "'Special Elite',cursive" }}
                    >
                      {m === 'premade' ? 'Pre-made' : m === 'draw' ? 'Draw' : 'Monogram'}
                    </div>
                  ))}
                </div>

                {sealMode === 'premade' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                    {STAMPS.map(s => (
                      <div
                        key={s}
                        onClick={() => setSymbol(s)}
                        style={{ aspectRatio: '1', background: symbol === s ? 'rgba(200,160,70,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${symbol === s ? '#c8a030' : 'rgba(200,160,70,0.15)'}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', transition: 'all 0.2s', color: '#c8a030' }}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}

                {sealMode === 'draw' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <canvas
                      ref={drawCanvasRef}
                      width={120}
                      height={120}
                      style={{ borderRadius: '50%', cursor: 'crosshair', display: 'block', margin: '0 auto', border: '2px solid rgba(200,160,70,0.3)' }}
                      onMouseDown={handleDrawMouseDown}
                      onMouseMove={handleDrawMouseMove}
                      onMouseUp={handleDrawMouseUp}
                      onMouseLeave={handleDrawMouseUp}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => { hasDrawDataRef.current = false; setupDrawCanvas(); renderSealPreview(); }}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,160,70,0.2)', color: '#c8a030', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontFamily: "'Special Elite',cursive", fontSize: '11px' }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {sealMode === 'mono' && (
                  <div>
                    <input
                      value={monoText}
                      onChange={(e) => setMonoText(e.target.value.slice(0,3))}
                      placeholder="Type initials..."
                      maxLength={3}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,160,70,0.2)', borderRadius: '6px', padding: '8px 12px', color: '#e8d5a0', fontFamily: "'Cormorant Garamond',serif", fontSize: '22px', fontStyle: 'italic', outline: 'none', width: '100%', textAlign: 'center', letterSpacing: '4px', marginBottom: '8px' }}
                    />
                    <div style={{ fontSize: '10px', color: '#6a5830', textAlign: 'center', letterSpacing: '1px' }}>1–3 characters</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(200,160,70,0.15)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#8a7040', alignSelf: 'stretch', marginBottom: '6px', paddingBottom: '8px', borderBottom: '1px solid rgba(200,160,70,0.1)' }}>Live Preview</div>
              <canvas ref={sealPreviewRef} width={160} height={160} style={{ animation: 'waxDrip 2s ease-in-out infinite' }} />
              <div style={{ fontSize: '10px', color: '#6a5830', textAlign: 'center', letterSpacing: '1px', marginTop: '4px' }}>Seal on envelope</div>
              <canvas ref={envWithSealRef} width={260} height={173} style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(200,160,70,0.1)' }}>
            <button onClick={() => goToPanel('envelope')} style={btnStyle(false)}>← Back</button>
            <button onClick={handleSealAndPreview} disabled={isSaving} style={btnStyle(true)}>
              {isSaving ? 'Sealing…' : 'Preview & Send →'}
            </button>
          </div>
        </div>
      )}

      {/* ====== PANEL: SEND ====== */}
      {panel === 'send' && (
        <div style={{ padding: '24px 20px', maxWidth: '780px', margin: '0 auto' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '22px', fontStyle: 'italic', color: '#c8a030', textAlign: 'center', marginBottom: '6px', letterSpacing: '1px' }}>Ready to Send</div>
          <div style={{ fontSize: '11px', color: '#6a5830', textAlign: 'center', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '24px' }}>Click the wax seal to reveal your letter</div>

          <div style={{ maxWidth: '520px', margin: '0 auto 28px', position: 'relative' }}>
            <canvas
              ref={finalEnvRef}
              width={520}
              height={346}
              style={{ width: '100%', borderRadius: '16px', boxShadow: '0 12px 50px rgba(0,0,0,0.7)', cursor: 'pointer', display: 'block' }}
              onClick={() => { playEnvelopeOpen(); setLetterOpen(true); }}
            />
            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px', color: '#5a4830', letterSpacing: '1px' }}>
              ↑ Click to reveal the letter inside
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', maxWidth: '520px', margin: '0 auto', flexWrap: 'wrap' }}>
            <button
              onClick={handleEmail}
              style={{ flex: 1, minWidth: '140px', padding: '14px 20px', borderRadius: '10px', border: 'none', fontFamily: "'Special Elite',cursive", fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', background: 'linear-gradient(135deg,#7a2020,#a02828)', color: '#f5e0c8', boxShadow: '0 4px 14px rgba(120,30,30,0.4)', letterSpacing: '0.5px' }}
            >
              ✉ Send via Email
            </button>
            <button
              onClick={handleDownload}
              style={{ flex: 1, minWidth: '140px', padding: '14px 20px', borderRadius: '10px', border: 'none', fontFamily: "'Special Elite',cursive", fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', background: 'linear-gradient(135deg,#1e4a1e,#2a6428)', color: '#c0e0b0', boxShadow: '0 4px 14px rgba(20,80,20,0.4)', letterSpacing: '0.5px' }}
            >
              ⬇ Export HTML
            </button>
            <button
              onClick={handleCopyLink}
              disabled={shareLetter.isPending}
              style={{ flex: 1, minWidth: '140px', padding: '14px 20px', borderRadius: '10px', border: 'none', fontFamily: "'Special Elite',cursive", fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', background: 'linear-gradient(135deg,#1a2a4a,#1e3868)', color: '#b0c8e8', boxShadow: '0 4px 14px rgba(20,40,100,0.4)', letterSpacing: '0.5px' }}
            >
              {copied ? '✓ Copied!' : '⚭ Copy Link'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(200,160,70,0.1)' }}>
            <button onClick={() => goToPanel('seal')} style={btnStyle(false)}>← Back</button>
            <button onClick={() => setLocation('/')} style={btnStyle(true)}>✦ Write New Letter</button>
          </div>
        </div>
      )}
    </div>
  );
}
