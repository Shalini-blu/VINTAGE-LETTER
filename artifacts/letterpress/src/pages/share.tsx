import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useGetSharedLetter } from '@workspace/api-client-react';
import { drawEnvelopeCanvas, type EnvType, type SealMode } from '@/lib/canvas';
import { drawDistress, distressFromParams, type DistressSettings } from '@/lib/distress';
import { playEnvelopeOpen, playButtonClick, resumeAudio } from '@/lib/sounds';

const PAPER_BG_CSS: Record<string, React.CSSProperties> = {
  plain:     { background: '#f5f0e0' },
  lined:     { background: '#f5f0e0', backgroundImage: 'repeating-linear-gradient(transparent,transparent 31px,rgba(200,180,150,0.45) 31px,rgba(200,180,150,0.45) 32px)', backgroundSize: '100% 32px' },
  aged:      { background: '#e8d9b5', backgroundImage: 'radial-gradient(ellipse at 20% 30%,rgba(180,140,80,0.15) 0%,transparent 50%),radial-gradient(ellipse at 80% 70%,rgba(160,120,60,0.1) 0%,transparent 40%)' },
  parchment: { background: '#d4c090' },
  graph:     { background: '#f0eedc', backgroundImage: 'repeating-linear-gradient(rgba(180,160,100,0.5) 0,rgba(180,160,100,0.5) 1px,transparent 1px,transparent 32px),repeating-linear-gradient(90deg,rgba(180,160,100,0.4) 0,rgba(180,160,100,0.4) 1px,transparent 1px,transparent 32px)', backgroundSize: '32px 32px' },
};

export default function Share() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();

  const { data: letter, isLoading, isError } = useGetSharedLetter(token);

  const [phase, setPhase] = useState<'sealed' | 'opening' | 'open'>('sealed');
  const [letterVisible, setLetterVisible] = useState(false);

  const envSealedRef = useRef<HTMLCanvasElement>(null);
  const envOpenRef   = useRef<HTMLCanvasElement>(null);
  const distressRef  = useRef<HTMLCanvasElement>(null);

  // Parse distress from URL params
  const distress: DistressSettings = distressFromParams(window.location.search);
  const hasDistress = distress.foxing || distress.edges || distress.burns || distress.wrinkles || distress.fade || distress.bleed;

  const bleedFilter = distress.bleed
    ? `blur(${0.28 + (distress.level / 5) * 0.52}px) contrast(${1 - (distress.level / 5) * 0.04})`
    : 'none';

  /* Draw envelopes once letter loads */
  useEffect(() => {
    if (!letter) return;
    const env  = (letter.envelopeStyle as EnvType)  || 'cream';
    const wax  = letter.waxSealColor  || '#c01010';
    const sym  = letter.waxSealSymbol || '✦';
    const from = letter.senderName    || '';
    const to   = letter.recipientName || '';

    if (envSealedRef.current) {
      drawEnvelopeCanvas(envSealedRef.current, 520, 346, env, true,  from, '', to, '', false, wax, 'premade' as SealMode, sym, '', null);
    }
    if (envOpenRef.current) {
      drawEnvelopeCanvas(envOpenRef.current,   520, 346, env, false, from, '', to, '', true,  wax, 'premade' as SealMode, sym, '', null);
    }
  }, [letter]);

  /* Draw distress overlay on the paper when letter opens */
  useEffect(() => {
    if (!letterVisible || !distressRef.current || !letter) return;
    const c = distressRef.current;
    drawDistress(c, c.width, c.height, distress, letter.id);
  }, [letterVisible, letter]);

  const handleSealClick = () => {
    if (phase !== 'sealed') return;
    resumeAudio();
    playEnvelopeOpen();
    setPhase('opening');
    setTimeout(() => {
      setPhase('open');
      setTimeout(() => setLetterVisible(true), 200);
    }, 600);
  };

  const paperStyle = PAPER_BG_CSS[letter?.paperTexture || 'plain'] || PAPER_BG_CSS.plain;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#3d2410 0%,#1a0d04 50%,#2a1508 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Special Elite',cursive" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=IM+Fell+English:ital@0;1&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
        @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sealPulse { 0%,100%{opacity:0.5} 50%{opacity:0.9} }
        @keyframes envFlap  { 0%{transform:scaleY(1)} 100%{transform:scaleY(-0.7)} }
        @keyframes letterSlide { from{opacity:0;transform:translateY(60px) scale(0.94)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes shimmer  { 0%{opacity:0.3} 50%{opacity:0.7} 100%{opacity:0.3} }
        .share-env { transition: transform 0.25s, filter 0.25s; }
        .share-env:hover { transform: translateY(-5px); filter: drop-shadow(0 16px 40px rgba(0,0,0,0.7)); }
      `}</style>

      {/* ── Loading ── */}
      {isLoading && (
        <div style={{ textAlign: 'center', color: '#6a5830', animation: 'shimmer 1.8s ease-in-out infinite' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✉</div>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' }}>Retrieving your letter…</div>
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>✉</div>
          <div style={{ fontSize: 18, color: '#c8a030', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', marginBottom: 8 }}>Letter Not Found</div>
          <div style={{ fontSize: 12, color: '#6a5830', lineHeight: 1.7, marginBottom: 20 }}>
            This share link may have expired or the letter may no longer be available.
          </div>
          <button onClick={() => setLocation('/')} style={{ background: 'linear-gradient(135deg,#6a4010,#a07020)', border: 'none', color: '#f0d8a0', padding: '10px 24px', borderRadius: 8, fontFamily: "'Special Elite',cursive", fontSize: 12, cursor: 'pointer', letterSpacing: 1 }}>
            Open Letterpress
          </button>
        </div>
      )}

      {/* ── Letter experience ── */}
      {letter && (
        <div style={{ width: '100%', maxWidth: 560, animation: 'fadeUp 0.6s ease' }}>

          {/* Sender tag */}
          {letter.senderName && (
            <div style={{ textAlign: 'center', fontSize: 10, letterSpacing: 2.5, color: '#6a5830', textTransform: 'uppercase', marginBottom: 14, opacity: 0.8 }}>
              A letter from {letter.senderName}{letter.recipientName ? ` · for ${letter.recipientName}` : ''}
            </div>
          )}

          {/* Envelope area */}
          <div style={{ position: 'relative' }}>

            {/* Sealed envelope */}
            <div
              className={phase === 'sealed' ? 'share-env' : ''}
              onClick={handleSealClick}
              style={{
                cursor: phase === 'sealed' ? 'pointer' : 'default',
                position: 'relative',
                opacity: phase === 'open' ? 0 : 1,
                transition: 'opacity 0.4s ease',
                display: phase === 'open' ? 'none' : 'block',
              }}
            >
              <canvas
                ref={envSealedRef}
                width={520}
                height={346}
                style={{ width: '100%', borderRadius: 16, boxShadow: '0 12px 50px rgba(0,0,0,0.75),0 0 0 1px rgba(200,160,70,0.15)', display: 'block' }}
              />
              {/* Opening animation overlay */}
              {phase === 'opening' && (
                <canvas
                  ref={envOpenRef}
                  width={520}
                  height={346}
                  style={{ position: 'absolute', inset: 0, width: '100%', borderRadius: 16, animation: 'fadeUp 0.4s ease' }}
                />
              )}
            </div>

            {/* Click hint — only when sealed */}
            {phase === 'sealed' && (
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 10, color: '#6a5030', letterSpacing: 2, textTransform: 'uppercase', animation: 'sealPulse 2.4s ease-in-out infinite' }}>
                ✦ Click the wax seal to open ✦
              </div>
            )}

            {/* Opening hint */}
            {phase === 'opening' && (
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 10, color: '#8a7040', letterSpacing: 2, textTransform: 'uppercase' }}>
                Breaking the seal…
              </div>
            )}
          </div>

          {/* ── Letter paper modal ── */}
          {letterVisible && (
            <div style={{ marginTop: 20, animation: 'letterSlide 0.55s cubic-bezier(0.34,1.4,0.64,1)' }}>
              <div
                style={{
                  position: 'relative',
                  ...paperStyle,
                  borderRadius: 4,
                  padding: '48px 52px 52px 64px',
                  boxShadow: '0 20px 70px rgba(0,0,0,0.75),inset 0 0 0 1px rgba(160,130,80,0.25)',
                  overflow: 'hidden',
                }}
              >
                {/* Paper holes */}
                <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: '40px 0', pointerEvents: 'none' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(0,0,0,0.09)', border: '1px solid rgba(0,0,0,0.07)' }} />)}
                </div>
                {/* Red margin */}
                <div style={{ position: 'absolute', left: 38, top: 0, bottom: 0, width: 1, background: 'rgba(180,80,80,0.22)', pointerEvents: 'none' }} />

                {/* Title */}
                {letter.title && (
                  <div style={{ fontFamily: letter.font || "'Courier Prime',monospace", color: letter.inkColor || '#1a0f05', fontSize: 20, fontWeight: 700, marginBottom: 8, letterSpacing: '0.4px', filter: bleedFilter }}>
                    {letter.title}
                  </div>
                )}

                {/* From / To meta */}
                {(letter.senderName || letter.recipientName) && (
                  <div style={{ display: 'flex', gap: 20, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.09)' }}>
                    {letter.senderName    && <div style={{ fontSize: 11, color: 'rgba(80,50,20,0.5)', fontFamily: "'Special Elite',cursive", letterSpacing: '0.5px' }}>From: {letter.senderName}</div>}
                    {letter.recipientName && <div style={{ fontSize: 11, color: 'rgba(80,50,20,0.5)', fontFamily: "'Special Elite',cursive", letterSpacing: '0.5px' }}>To: {letter.recipientName}</div>}
                  </div>
                )}

                {/* Body */}
                <div style={{ fontFamily: letter.font || "'Courier Prime',monospace", color: letter.inkColor || '#1a0f05', fontSize: 15, lineHeight: '2em', whiteSpace: 'pre-wrap', letterSpacing: '0.03em', filter: bleedFilter }}>
                  {letter.content || ''}
                </div>

                {/* Signature */}
                {letter.senderName && (
                  <div style={{ marginTop: 32, fontFamily: letter.font || "'Courier Prime',monospace", color: letter.inkColor || '#1a0f05', fontSize: 14, fontStyle: 'italic', opacity: 0.6, filter: bleedFilter }}>
                    — {letter.senderName}
                  </div>
                )}

                {/* Distress overlay canvas */}
                {hasDistress && (
                  <canvas
                    ref={distressRef}
                    width={700}
                    height={600}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', mixBlendMode: 'multiply' }}
                  />
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                {letter.recipientEmail && (
                  <button
                    onClick={() => { playButtonClick(); window.open(`mailto:${letter.recipientEmail}?subject=${encodeURIComponent(letter.title || 'A letter for you')}&body=${encodeURIComponent(letter.content || '')}`, '_blank'); }}
                    style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(200,160,70,0.25)', fontFamily: "'Special Elite',cursive", fontSize: 12, cursor: 'pointer', background: 'rgba(200,160,70,0.12)', color: '#c8a030', letterSpacing: 0.5 }}
                  >
                    ✉ Reply by Email
                  </button>
                )}
                <button
                  onClick={() => { playButtonClick(); setLocation('/'); }}
                  style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(200,160,70,0.2)', fontFamily: "'Special Elite',cursive", fontSize: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: '#8a7040', letterSpacing: 0.5 }}
                >
                  Write Your Own Letter
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
