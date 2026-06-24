import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import {
  useGetLetter, useCreateLetter, useUpdateLetter, getGetLetterQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { addMyLetterId, getDistressSettings, saveDistressSettings } from '@/lib/storage';
import { drawDistress, defaultDistress, type DistressSettings } from '@/lib/distress';
import {
  playKey, playReturn, playPaperFeed, playDrawerOpen, playDrawerClose,
  playLeverClick, playLeverRelease, playButtonClick, resumeAudio,
  startAmbient, stopAmbient,
} from '@/lib/sounds';

/* ─── Constants ─────────────────────────────────────────────── */
const PAPER_H = 280;
const CARRIAGE_Y = 64;
const LINE_H = 32;
const COL_EST = 52;

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];

const PAPER_BG: Record<string, React.CSSProperties> = {
  plain:     { background: '#f5f0e0' },
  lined:     { background: '#f5f0e0', backgroundImage: 'repeating-linear-gradient(transparent,transparent 31px,rgba(200,180,150,0.45) 31px,rgba(200,180,150,0.45) 32px)', backgroundSize: '100% 32px', backgroundPosition: `0 ${CARRIAGE_Y}px` },
  aged:      { background: '#e8d9b5', backgroundImage: 'radial-gradient(ellipse at 20% 30%,rgba(180,140,80,0.15) 0%,transparent 50%),radial-gradient(ellipse at 80% 70%,rgba(160,120,60,0.1) 0%,transparent 40%)' },
  parchment: { background: '#d4c090' },
  graph:     { background: '#f0eedc', backgroundImage: 'repeating-linear-gradient(rgba(180,160,100,0.5) 0,rgba(180,160,100,0.5) 1px,transparent 1px,transparent 32px),repeating-linear-gradient(90deg,rgba(180,160,100,0.4) 0,rgba(180,160,100,0.4) 1px,transparent 1px,transparent 32px)', backgroundSize: '32px 32px' },
};

const FONT_OPTIONS = [
  { label: 'Courier',     value: "'Courier Prime',monospace" },
  { label: 'Typewriter',  value: "'Special Elite',cursive" },
  { label: 'Fell',        value: "'IM Fell English',serif" },
  { label: 'Playfair',    value: "'Playfair Display',serif" },
  { label: 'Baskerville', value: "'Libre Baskerville',serif" },
  { label: 'Cormorant',   value: "'Cormorant Garamond',serif" },
];

const INK_OPTIONS = [
  { label: 'Ink',     value: '#1a0f05' },
  { label: 'Sepia',   value: '#2d1a06' },
  { label: 'Forest',  value: '#1a2d1a' },
  { label: 'Navy',    value: '#1a1a3d' },
  { label: 'Crimson', value: '#8b1a1a' },
  { label: 'Violet',  value: '#2a1a3d' },
];

const DISTRESS_OPTS: { key: keyof Omit<DistressSettings, 'level'>; label: string; desc: string }[] = [
  { key: 'foxing',   label: 'Foxing',         desc: 'Brown age spots'     },
  { key: 'burns',    label: 'Burnt Corners',  desc: 'Singed edges'        },
  { key: 'edges',    label: 'Torn Edges',     desc: 'Irregular border'    },
  { key: 'wrinkles', label: 'Wrinkles',       desc: 'Crease marks'        },
  { key: 'fade',     label: 'Discoloration',  desc: 'Uneven yellowing'    },
  { key: 'bleed',    label: 'Ink Bleed',      desc: 'Ink spread effect'   },
];

const INTENSITY_LABELS = ['', 'Subtle', 'Light', 'Moderate', 'Heavy', 'Extreme'];

/* ─── Component ─────────────────────────────────────────────── */
export default function Write() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const letterId = params.id ? parseInt(params.id, 10) : undefined;
  const { data: letter } = useGetLetter(letterId!, { query: { enabled: !!letterId, queryKey: getGetLetterQueryKey(letterId!) } });
  const createLetter = useCreateLetter();
  const updateLetter = useUpdateLetter();

  const [title, setTitle] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [content, setContent] = useState('');
  const [font, setFont] = useState("'Courier Prime',monospace");
  const [fontSize, setFontSize] = useState('16px');
  const [inkColor, setInkColor] = useState('#1a0f05');
  const [paperType, setPaperType] = useState('plain');
  const [soundOn, setSoundOn] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentId, setCurrentId] = useState<number | undefined>(letterId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pressedKey, setPressedKey] = useState('');
  const [carriageReturn, setCarriageReturn] = useState(false);
  const [distress, setDistress] = useState<DistressSettings>(defaultDistress);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leverRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const leverClickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [leverPct, setLeverPct] = useState(50);
  const distressCanvasRef = useRef<HTMLCanvasElement>(null);

  /* Load letter data + distress */
  useEffect(() => {
    if (!letter) return;
    setTitle(letter.title || '');
    setRecipientName(letter.recipientName || '');
    setSenderName(letter.senderName || '');
    setContent(letter.content || '');
    setFont(letter.font || "'Courier Prime',monospace");
    setInkColor(letter.inkColor || '#1a0f05');
    setPaperType(letter.paperTexture || 'plain');
    setCurrentId(letter.id);
    const saved = getDistressSettings(letter.id);
    if (saved) setDistress(saved);
  }, [letter]);

  /* Redraw distress canvas when settings change */
  useEffect(() => {
    const c = distressCanvasRef.current;
    if (!c) return;
    drawDistress(c, c.width, c.height, distress, currentId ?? 42);
  }, [distress, currentId]);

  /* Save distress to localStorage */
  useEffect(() => {
    if (!currentId) return;
    saveDistressSettings(currentId, distress);
  }, [distress, currentId]);

  /* Ambient sound */
  useEffect(() => {
    if (soundOn) startAmbient();
    else stopAmbient();
    return () => stopAmbient();
  }, [soundOn]);

  const toggleDistress = useCallback((key: keyof Omit<DistressSettings, 'level'>) => {
    setDistress(d => ({ ...d, [key]: !d[key] }));
    playButtonClick();
  }, []);

  /* Keep cursor at carriage line */
  const syncScroll = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? el.value.length;
    const line = el.value.substring(0, cursor).split('\n').length - 1;
    el.scrollTop = line * LINE_H;
  }, []);

  useEffect(() => { syncScroll(); }, [content, syncScroll]);

  const lines = content.split('\n');
  const curLine = lines[lines.length - 1] || '';
  const carriagePct = carriageReturn ? 0 : Math.min(1, curLine.length / COL_EST);

  const autoSave = useCallback((data: {
    title: string; content: string; recipientName: string; senderName: string;
    font: string; inkColor: string; paperTexture: string; id?: number;
  }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!data.id) return;
      setIsSaving(true);
      try {
        await updateLetter.mutateAsync({ id: data.id, data: { ...data, title: data.title || 'Untitled Letter', status: 'draft' } });
        queryClient.invalidateQueries({ queryKey: getGetLetterQueryKey(data.id) });
      } finally { setIsSaving(false); }
    }, 1200);
  }, [updateLetter, queryClient]);

  const flashKey = useCallback((k: string) => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    setPressedKey(k.toUpperCase());
    pressTimer.current = setTimeout(() => setPressedKey(''), 130);
  }, []);

  const triggerReturn = useCallback(() => {
    setCarriageReturn(true);
    setTimeout(() => setCarriageReturn(false), 450);
    if (soundOn) { playReturn(); playPaperFeed(); }
  }, [soundOn]);

  /* Lever drag with ratchet clicks */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !leverRef.current) return;
      const r = leverRef.current.getBoundingClientRect();
      setLeverPct(Math.min(95, Math.max(5, ((e.clientX - r.left) / r.width) * 100)));
    };
    const onUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        if (leverClickTimer.current) { clearInterval(leverClickTimer.current); leverClickTimer.current = null; }
        if (soundOn) playLeverRelease();
        triggerReturn();
        setTimeout(() => setLeverPct(50), 500);
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (leverClickTimer.current) clearInterval(leverClickTimer.current);
    };
  }, [triggerReturn, soundOn]);

  /* Keyboard events */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (document.activeElement !== textareaRef.current) return;
      if (e.key === 'Enter') { triggerReturn(); flashKey('↵'); return; }
      if (e.key === 'Backspace') { if (soundOn) playKey(); flashKey('⌫'); return; }
      if (e.key === ' ') { if (soundOn) playKey(); flashKey('⎵'); return; }
      if (e.key.length === 1) { if (soundOn) playKey(); flashKey(e.key); }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [soundOn, flashKey, triggerReturn]);

  const insertAt = (char: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart, e2 = el.selectionEnd;
    const next = content.substring(0, s) + char + content.substring(e2);
    setContent(next);
    autoSave({ title, content: next, recipientName, senderName, font, inkColor, paperTexture: paperType, id: currentId });
    setTimeout(() => { if (el) { el.selectionStart = el.selectionEnd = s + char.length; el.focus(); } }, 0);
  };

  const deleteChar = () => {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart;
    if (s > 0) {
      const next = content.substring(0, s - 1) + content.substring(s);
      setContent(next);
      autoSave({ title, content: next, recipientName, senderName, font, inkColor, paperTexture: paperType, id: currentId });
      setTimeout(() => { if (el) { el.selectionStart = el.selectionEnd = s - 1; el.focus(); } }, 0);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    autoSave({ title, content: e.target.value, recipientName, senderName, font, inkColor, paperTexture: paperType, id: currentId });
  };

  const handleContinue = async () => {
    let id = currentId;
    const payload = { title: title || 'Untitled Letter', content, recipientName, senderName, font, inkColor, paperTexture: paperType, status: 'draft' as const };
    if (!id) {
      const created = await createLetter.mutateAsync({ data: payload });
      id = created.id;
      setCurrentId(id);
      addMyLetterId(id);
    } else {
      await updateLetter.mutateAsync({ id, data: payload });
    }
    setLocation(`/seal/${id}`);
  };

  const toggleDrawer = () => {
    resumeAudio();
    if (soundOn) {
      if (drawerOpen) playDrawerClose();
      else playDrawerOpen();
    }
    setDrawerOpen(o => !o);
  };

  const paperStyle = PAPER_BG[paperType] || PAPER_BG.plain;
  const anyDistress = DISTRESS_OPTS.some(o => distress[o.key]);

  const bleedFilter = distress.bleed
    ? `blur(${0.28 + (distress.level / 5) * 0.52}px) contrast(${1 - (distress.level / 5) * 0.04})`
    : 'none';

  const keyBtn = (label: string, w?: number): React.CSSProperties => ({
    width: w ?? 42, height: 38, flexShrink: 0,
    background: pressedKey === label.toUpperCase()
      ? 'linear-gradient(180deg,#1c1c1c,#242424)'
      : 'linear-gradient(180deg,#383838 0%,#2a2a2a 50%,#1e1e1e 100%)',
    border: '1px solid #555',
    borderBottom: pressedKey === label.toUpperCase() ? '1px solid #333' : '3px solid #111',
    borderRadius: 5, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Special Elite',cursive", fontSize: w && w > 60 ? 11 : 13,
    color: pressedKey === label.toUpperCase() ? '#c8a030' : '#aaa',
    transform: pressedKey === label.toUpperCase() ? 'translateY(2px)' : 'translateY(0)',
    transition: 'all 0.08s',
    boxShadow: pressedKey === label.toUpperCase() ? 'none' : '0 2px 0 rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.06)',
    userSelect: 'none', letterSpacing: 1,
  });

  return (
    <div
      style={{ minHeight: '100vh', background: 'repeating-linear-gradient(92deg,transparent,transparent 60px,rgba(0,0,0,0.03) 60px,rgba(0,0,0,0.03) 61px),linear-gradient(180deg,#3d2410 0%,#5c3418 30%,#4a2810 70%,#3a1e0a 100%)', padding: '16px 16px 32px', fontFamily: "'Special Elite',cursive", userSelect: 'none' }}
      onClick={() => resumeAudio()}
    >
      <style>{`
        @keyframes keyPop { 0%{transform:translateY(0)} 40%{transform:translateY(3px)} 100%{transform:translateY(0)} }
        @keyframes drawerIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        .ta-noscroll::-webkit-scrollbar{display:none}
        .dg-toggle{transition:all 0.15s;} .dg-toggle:hover{filter:brightness(1.08)}
      `}</style>

      {/* ── Machine body ── */}
      <div style={{ maxWidth: 820, margin: '0 auto', background: 'linear-gradient(170deg,#272727 0%,#1a1a1a 50%,#222 100%)', borderRadius: 20, border: '2px solid #111', boxShadow: '0 12px 48px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative' }}>

        {/* ── Settings drawer ── */}
        {drawerOpen && (
          <div style={{ position: 'absolute', top: 0, right: 0, width: 282, height: '100%', background: 'linear-gradient(180deg,#191919,#131313)', borderLeft: '1px solid rgba(200,160,70,0.18)', zIndex: 40, animation: 'drawerIn 0.28s cubic-bezier(0.34,1.2,0.64,1)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 13px', borderBottom: '1px solid rgba(200,160,70,0.1)', flexShrink: 0 }}>
              <span style={{ fontSize: 10, letterSpacing: 2.5, color: '#8a7040', textTransform: 'uppercase' }}>Machine Settings</span>
              <button onClick={toggleDrawer} style={{ background: 'none', border: 'none', color: '#6a5030', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 6px' }}>✕</button>
            </div>

            {/* Font */}
            <div style={{ padding: '12px 16px 14px', borderBottom: '1px solid rgba(200,160,70,0.07)' }}>
              <div style={{ fontSize: 9, color: '#6a5830', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Font</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {FONT_OPTIONS.map(f => (
                  <div key={f.value} className="dg-toggle" onClick={() => { setFont(f.value); playButtonClick(); autoSave({ title, content, recipientName, senderName, font: f.value, inkColor, paperTexture: paperType, id: currentId }); }} style={{ padding: '7px 11px', borderRadius: 6, background: font === f.value ? 'rgba(200,160,70,0.11)' : 'rgba(255,255,255,0.025)', border: `1px solid ${font === f.value ? '#c8a030' : 'rgba(200,160,70,0.09)'}`, cursor: 'pointer', color: font === f.value ? '#c8a030' : '#777', fontFamily: f.value, fontSize: 13 }}>
                    {f.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Ink */}
            <div style={{ padding: '12px 16px 14px', borderBottom: '1px solid rgba(200,160,70,0.07)' }}>
              <div style={{ fontSize: 9, color: '#6a5830', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Ink Colour</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {INK_OPTIONS.map(ink => (
                  <div key={ink.value} onClick={() => { setInkColor(ink.value); playButtonClick(); autoSave({ title, content, recipientName, senderName, font, inkColor: ink.value, paperTexture: paperType, id: currentId }); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: ink.value, border: `2px solid ${inkColor === ink.value ? '#c8a030' : 'rgba(200,160,70,0.18)'}`, transform: inkColor === ink.value ? 'scale(1.18)' : 'scale(1)', transition: 'all 0.15s', boxShadow: inkColor === ink.value ? '0 0 0 2px rgba(200,160,70,0.3)' : 'none' }} />
                    <span style={{ fontSize: 8, color: inkColor === ink.value ? '#c8a030' : '#6a5830', letterSpacing: 0.5 }}>{ink.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Paper */}
            <div style={{ padding: '12px 16px 14px', borderBottom: '1px solid rgba(200,160,70,0.07)' }}>
              <div style={{ fontSize: 9, color: '#6a5830', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Paper</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {(['plain','lined','aged','parchment','graph'] as const).map(p => (
                  <div key={p} className="dg-toggle" onClick={() => { setPaperType(p); playButtonClick(); autoSave({ title, content, recipientName, senderName, font, inkColor, paperTexture: p, id: currentId }); }} style={{ padding: '7px 11px', borderRadius: 6, background: paperType === p ? 'rgba(200,160,70,0.11)' : 'rgba(255,255,255,0.025)', border: `1px solid ${paperType === p ? '#c8a030' : 'rgba(200,160,70,0.09)'}`, cursor: 'pointer', color: paperType === p ? '#c8a030' : '#777', fontSize: 12, textTransform: 'capitalize' }}>
                    {p}
                  </div>
                ))}
              </div>
            </div>

            {/* Size */}
            <div style={{ padding: '12px 16px 14px', borderBottom: '1px solid rgba(200,160,70,0.07)' }}>
              <div style={{ fontSize: 9, color: '#6a5830', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 9 }}>Text Size</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {([['S','13px'],['M','16px'],['L','20px'],['G','24px']] as const).map(([lbl, val]) => (
                  <div key={val} onClick={() => { setFontSize(val); playButtonClick(); }} style={{ flex: 1, padding: '7px 4px', textAlign: 'center', borderRadius: 6, background: fontSize === val ? 'rgba(200,160,70,0.11)' : 'rgba(255,255,255,0.025)', border: `1px solid ${fontSize === val ? '#c8a030' : 'rgba(200,160,70,0.09)'}`, cursor: 'pointer', color: fontSize === val ? '#c8a030' : '#777', fontSize: 11 }}>
                    {lbl}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Paper Aging / Distress ── */}
            <div style={{ padding: '12px 16px 14px', borderBottom: '1px solid rgba(200,160,70,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                <div style={{ fontSize: 9, color: anyDistress ? '#c8a030' : '#6a5830', letterSpacing: 2, textTransform: 'uppercase' }}>
                  Paper Aging {anyDistress && '✦'}
                </div>
                {anyDistress && (
                  <div onClick={() => { setDistress(defaultDistress); playButtonClick(); }} style={{ fontSize: 8, color: '#5a4020', cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase' }}>Clear</div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {DISTRESS_OPTS.map(opt => (
                  <div
                    key={opt.key}
                    className="dg-toggle"
                    onClick={() => toggleDistress(opt.key)}
                    style={{
                      padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                      background: distress[opt.key] ? 'rgba(200,160,70,0.09)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${distress[opt.key] ? 'rgba(200,160,70,0.35)' : 'rgba(200,160,70,0.07)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: distress[opt.key] ? '#c8a030' : '#777' }}>{opt.label}</div>
                      <div style={{ fontSize: 8, color: '#4a3818', marginTop: 1 }}>{opt.desc}</div>
                    </div>
                    {/* Toggle pill */}
                    <div style={{ width: 26, height: 14, borderRadius: 8, background: distress[opt.key] ? '#7a5010' : '#252525', border: `1px solid ${distress[opt.key] ? '#c8a030' : '#3a3a3a'}`, position: 'relative', transition: 'all 0.2s', flexShrink: 0, marginLeft: 8 }}>
                      <div style={{ position: 'absolute', top: 2, left: distress[opt.key] ? 12 : 2, width: 8, height: 8, borderRadius: '50%', background: distress[opt.key] ? '#c8a030' : '#555', transition: 'left 0.18s' }} />
                    </div>
                  </div>
                ))}
              </div>

              {anyDistress && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 8, color: '#6a5830', letterSpacing: 1.5, textTransform: 'uppercase' }}>Intensity</span>
                    <span style={{ fontSize: 8, color: '#c8a030', letterSpacing: 1 }}>{INTENSITY_LABELS[distress.level]}</span>
                  </div>
                  <input
                    type="range" min={1} max={5} value={distress.level}
                    onChange={e => setDistress(d => ({ ...d, level: parseInt(e.target.value) }))}
                    style={{ width: '100%', accentColor: '#c8a030', cursor: 'pointer', height: 14 }}
                  />
                </div>
              )}
            </div>

            {/* Sound toggle */}
            <div style={{ padding: '12px 16px' }}>
              <div onClick={() => { setSoundOn(s => !s); playButtonClick(); }} style={{ padding: '9px 12px', borderRadius: 6, background: soundOn ? 'rgba(200,160,70,0.11)' : 'rgba(255,255,255,0.025)', border: `1px solid ${soundOn ? '#c8a030' : 'rgba(200,160,70,0.09)'}`, cursor: 'pointer', color: soundOn ? '#c8a030' : '#777', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{soundOn ? '🔊' : '🔇'}</span>
                <span>{soundOn ? 'Sound On' : 'Sound Off'}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Header bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: '1px solid #333' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div onClick={() => setLocation('/')} style={{ width: 10, height: 10, borderRadius: '50%', background: '#8b2020', border: '1px solid #666', cursor: 'pointer' }} title="Dashboard" />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#8b6d20', border: '1px solid #666' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#208b40', border: '1px solid #666' }} />
          </div>
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); autoSave({ title: e.target.value, content, recipientName, senderName, font, inkColor, paperTexture: paperType, id: currentId }); }}
            placeholder="Letter title…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#888', fontFamily: "'Special Elite',cursive", fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: '#5a4830', letterSpacing: 1 }}>{isSaving ? 'SAVING…' : `${content.length}`}</span>
            <div
              onClick={toggleDrawer}
              style={{ width: 30, height: 30, borderRadius: '50%', background: anyDistress ? 'linear-gradient(135deg,#704010,#c8a030)' : 'linear-gradient(135deg,#6a5010,#a07820)', border: `1px solid ${anyDistress ? '#e8b840' : '#c8a030'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, boxShadow: anyDistress ? '0 2px 14px rgba(200,160,70,0.55)' : '0 2px 8px rgba(200,160,70,0.28)', transition: 'all 0.2s', userSelect: 'none' }}
              title="Settings"
            >⚙</div>
          </div>
        </div>

        {/* ── Carriage rail ── */}
        <div style={{ background: '#141414', padding: '10px 20px 0', borderBottom: '1px solid #333' }}>
          <div
            ref={leverRef}
            style={{ height: 26, background: '#0d0d0d', borderRadius: 4, border: '1px solid #333', position: 'relative', cursor: 'ew-resize', overflow: 'hidden' }}
            onMouseDown={e => {
              isDragging.current = true;
              resumeAudio();
              if (soundOn) {
                playLeverClick();
                leverClickTimer.current = setInterval(() => playLeverClick(), 110);
              }
              e.preventDefault();
            }}
          >
            <div style={{ position: 'absolute', top: '50%', left: 10, right: 10, height: 2, background: 'linear-gradient(90deg,#333,#555,#333)', transform: 'translateY(-50%)', borderRadius: 1 }} />
            <div style={{
              position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)',
              width: 34, height: 20,
              background: carriageReturn ? 'linear-gradient(180deg,#c8a855,#a07830)' : 'linear-gradient(180deg,#d4b460,#b08838)',
              borderRadius: 4, border: '1px solid #705020',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
              left: `${carriageReturn ? 4 : 10 + carriagePct * 80}%`,
              transition: carriageReturn ? 'left 0.35s cubic-bezier(0.2,0,0.4,1)' : 'left 0.12s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, color: 'rgba(0,0,0,0.35)', letterSpacing: 1, userSelect: 'none',
            }}>▐▌</div>
            <div style={{ position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)', fontSize: 8, color: '#555', letterSpacing: 1, pointerEvents: 'none', fontFamily: "'Special Elite',cursive" }}>CARRIAGE RETURN</div>
          </div>
          <div style={{ height: 10, background: 'linear-gradient(180deg,#f5f0e0,#ede6cc)', borderRadius: '2px 2px 0 0', margin: '6px 40px 0', border: '1px solid #d4c89a', borderBottom: 'none', boxShadow: '0 -3px 8px rgba(0,0,0,0.3)' }} />
        </div>

        {/* ── Paper view ── */}
        <div style={{ position: 'relative', height: PAPER_H, margin: '0 40px', overflow: 'hidden', ...paperStyle }}>
          {/* Paper holes */}
          <div style={{ position: 'absolute', left: 14, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: '30px 0', zIndex: 4, pointerEvents: 'none' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.07)' }} />)}
          </div>
          {/* Red margin line */}
          <div style={{ position: 'absolute', left: 56, top: 0, bottom: 0, width: 1, background: 'rgba(180,80,80,0.22)', zIndex: 3, pointerEvents: 'none' }} />
          {/* Stamp area */}
          <div style={{ position: 'absolute', top: 12, right: 16, width: 54, height: 62, border: '1.5px dashed rgba(100,70,30,0.25)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, pointerEvents: 'none' }}>
            <span style={{ fontSize: 7, color: 'rgba(100,70,30,0.2)', fontFamily: "'Special Elite',cursive", letterSpacing: 0.5, textAlign: 'center', lineHeight: 1.4 }}>STAMP{'\n'}HERE</span>
          </div>
          {/* Carriage glow line */}
          <div style={{ position: 'absolute', top: CARRIAGE_Y, left: 0, right: 0, height: 1, background: 'rgba(200,160,70,0.35)', zIndex: 5, pointerEvents: 'none', boxShadow: '0 0 6px rgba(200,160,70,0.2)' }} />
          {/* Fade top */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: CARRIAGE_Y - 2, background: 'linear-gradient(180deg,rgba(0,0,0,0.08) 0%,transparent 100%)', zIndex: 6, pointerEvents: 'none' }} />
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onClick={syncScroll}
            onKeyUp={syncScroll}
            placeholder={'Begin your letter here…\n\nDear ____________,'}
            className="ta-noscroll"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              background: 'transparent', border: 'none', outline: 'none', resize: 'none',
              fontSize, lineHeight: `${LINE_H}px`, color: inkColor, fontFamily: font,
              caretColor: inkColor, padding: `${CARRIAGE_Y}px 70px 20px 64px`,
              overflowY: 'scroll', scrollbarWidth: 'none',
              zIndex: 2, letterSpacing: '0.03em',
              filter: bleedFilter,
            }}
          />
          {/* Distress overlay canvas — sits above text, uses multiply blending */}
          <canvas
            ref={distressCanvasRef}
            width={760}
            height={PAPER_H}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 7, mixBlendMode: 'multiply' }}
          />
        </div>

        {/* ── Keyboard ── */}
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px 20px 20px', borderTop: '1px solid #222' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {KEYBOARD_ROWS.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 5, marginLeft: ri === 1 ? 12 : ri === 2 ? 24 : 0 }}>
                {row.map(key => (
                  <div
                    key={key}
                    onClick={() => { resumeAudio(); insertAt(key.toLowerCase()); if (soundOn) playKey(); flashKey(key); }}
                    style={keyBtn(key)}
                  >{key}</div>
                ))}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
              <div onClick={() => { resumeAudio(); deleteChar(); if (soundOn) playKey(); flashKey('⌫'); }} style={keyBtn('⌫', 62)}>⌫</div>
              <div onClick={() => { resumeAudio(); insertAt(' '); if (soundOn) playKey(); flashKey('⎵'); }} style={{ ...keyBtn('⎵', 220), letterSpacing: 2, fontSize: 10, color: '#666' }}>SPACE</div>
              <div onClick={() => { resumeAudio(); insertAt('\n'); triggerReturn(); flashKey('↵'); }} style={{ ...keyBtn('↵', 62), color: '#6a9a6a' }}>↵</div>
            </div>
          </div>
        </div>

      </div>{/* end machine */}

      {/* ── From / To / Seal ── */}
      <div style={{ maxWidth: 820, margin: '12px auto 0', display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(200,160,70,0.12)', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            {[{lbl:'From',val:senderName,set:setSenderName,ph:'Your name'},{lbl:'To',val:recipientName,set:setRecipientName,ph:"Recipient's name"}].map(f => (
              <div key={f.lbl} style={{ flex: 1 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: '#6a5830', textTransform: 'uppercase', marginBottom: 4 }}>{f.lbl}</div>
                <input value={f.val} onChange={e => { f.set(e.target.value); autoSave({ title, content, recipientName: f.lbl === 'To' ? e.target.value : recipientName, senderName: f.lbl === 'From' ? e.target.value : senderName, font, inkColor, paperTexture: paperType, id: currentId }); }} placeholder={f.ph} style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(200,160,70,0.2)', outline: 'none', color: '#e8d5a0', fontFamily: "'Cormorant Garamond',serif", fontSize: 15, width: '100%', padding: '4px 0' }} />
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={handleContinue}
          disabled={createLetter.isPending || updateLetter.isPending}
          style={{ padding: '12px 28px', borderRadius: 10, border: 'none', fontFamily: "'Special Elite',cursive", fontSize: 13, cursor: 'pointer', letterSpacing: 1, background: 'linear-gradient(135deg,#8a6010,#c8a030)', color: '#1a0f05', boxShadow: '0 4px 20px rgba(200,160,30,0.25)', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
        >
          Seal & Send →
        </button>
      </div>
    </div>
  );
}
