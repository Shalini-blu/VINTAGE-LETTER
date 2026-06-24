import React, { useEffect, useState } from 'react';
import { useListLetters, useGetLetterStats, useCreateLetter, useDeleteLetter } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { getMyLetterIds, addMyLetterId, removeMyLetterId } from '@/lib/storage';

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  sent:      { bg: 'rgba(30,100,30,0.35)',  color: '#80e080' },
  completed: { bg: 'rgba(30,60,120,0.35)',  color: '#80b0e8' },
  draft:     { bg: 'rgba(100,80,20,0.35)',  color: '#c8a030' },
};

const PAPER_TOP: Record<string, string> = {
  plain: '#f5f0e0', lined: '#f5f0e0', aged: '#e8d9b5',
  parchment: '#d4c090', graph: '#f0eedc', cream: '#fdfbf7',
  kraft: '#c1a47b',
};

export default function Dashboard() {
  const { data: allLetters, isLoading, refetch } = useListLetters();
  const { data: stats } = useGetLetterStats();
  const [, setLocation] = useLocation();
  const createLetter = useCreateLetter();
  const deleteLetter = useDeleteLetter();
  const [myIds, setMyIds] = useState<number[]>([]);

  useEffect(() => { setMyIds(getMyLetterIds()); }, []);

  const letters = allLetters?.filter(l => myIds.includes(l.id)) ?? [];

  const handleWriteNew = () => {
    createLetter.mutate(
      { data: { title: 'Untitled Letter', content: '', status: 'draft' } },
      { onSuccess: (l) => { addMyLetterId(l.id); setMyIds(getMyLetterIds()); setLocation(`/write/${l.id}`); } }
    );
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Delete this letter?')) return;
    deleteLetter.mutate({ id }, {
      onSuccess: () => { removeMyLetterId(id); setMyIds(getMyLetterIds()); refetch(); }
    });
  };

  const totalLetters = letters.length;
  const draftCount = letters.filter(l => l.status === 'draft').length;
  const sentCount = letters.filter(l => l.status === 'sent').length;

  return (
    <div style={{ minHeight: '100vh', background: 'repeating-linear-gradient(92deg,transparent,transparent 60px,rgba(0,0,0,0.03) 60px,rgba(0,0,0,0.03) 61px),linear-gradient(180deg,#1a0d04 0%,#2a1508 40%,#1e0e04 100%)', fontFamily: "'Special Elite', cursive", color: '#c8a030' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <header style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(200,160,70,0.2)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px', opacity: 0.9 }}>✉</span>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '26px', fontStyle: 'italic', color: '#c8a030', letterSpacing: '1px', margin: 0 }}>Letterpress</h1>
          </div>
          <button
            onClick={handleWriteNew}
            disabled={createLetter.isPending}
            style={{ background: 'linear-gradient(135deg,#7a5010,#c8a030)', border: 'none', color: '#1a0f05', padding: '10px 22px', borderRadius: '8px', fontFamily: "'Special Elite',cursive", fontSize: '13px', cursor: 'pointer', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(200,160,30,0.25)', transition: 'all 0.2s' }}
            onMouseOver={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseOut={e => (e.currentTarget.style.filter = '')}
          >
            {createLetter.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <span>✦</span>}
            Write a Letter
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '48px' }}>
          {[
            { label: 'Total Letters', value: totalLetters, icon: '✉' },
            { label: 'Drafts', value: draftCount, icon: '✎' },
            { label: 'Sent', value: sentCount, icon: '✦' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(200,160,70,0.15)', borderRadius: '12px', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', opacity: 0.5 }}>{s.icon}</span>
                <span style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#6a5830' }}>{s.label}</span>
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '42px', color: '#c8a030', lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(200,160,70,0.1)' }} />
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '22px', fontStyle: 'italic', color: '#8a7040', margin: 0, letterSpacing: '1px' }}>Your Desk</h2>
          <div style={{ flex: 1, height: '1px', background: 'rgba(200,160,70,0.1)' }} />
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', gap: '12px', color: '#5a4830' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '12px', letterSpacing: '2px' }}>LOADING…</span>
          </div>
        ) : letters.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '20px' }}>
            {letters.map((letter, idx) => {
              const badge = STATUS_BADGE[letter.status] || STATUS_BADGE.draft;
              const paperColor = PAPER_TOP[letter.paperTexture || 'plain'] || '#f5f0e0';
              const isDraft = letter.status === 'draft';
              return (
                <div
                  key={letter.id}
                  onClick={() => setLocation(isDraft ? `/write/${letter.id}` : `/seal/${letter.id}`)}
                  style={{ cursor: 'pointer', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(200,160,70,0.12)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.25s', animation: `fadeUp 0.4s ease ${idx * 0.05}s both`, position: 'relative' }}
                  onMouseOver={e => { (e.currentTarget).style.transform = 'translateY(-4px)'; (e.currentTarget).style.borderColor = 'rgba(200,160,70,0.35)'; (e.currentTarget).style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)'; }}
                  onMouseOut={e => { (e.currentTarget).style.transform = ''; (e.currentTarget).style.borderColor = 'rgba(200,160,70,0.12)'; (e.currentTarget).style.boxShadow = ''; }}
                >
                  <div style={{ height: '5px', background: paperColor }} />
                  <div style={{ padding: '16px 20px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '4px', background: badge.bg, color: badge.color }}>
                        {letter.status}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#5a4830' }}>{format(new Date(letter.updatedAt), 'MMM d, yyyy')}</span>
                        <button
                          onClick={e => handleDelete(e, letter.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a3030', fontSize: '14px', padding: '2px 4px', opacity: 0.5, transition: 'opacity 0.2s', lineHeight: 1 }}
                          onMouseOver={e => (e.currentTarget.style.opacity = '1')}
                          onMouseOut={e => (e.currentTarget.style.opacity = '0.5')}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '20px', color: '#e8d5a0', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {letter.title || 'Untitled'}
                    </div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', fontSize: '13px', color: '#8a7040', marginBottom: '12px' }}>
                      To: {letter.recipientName || 'Someone'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6a5830', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: "'Cormorant Garamond',serif" }}>
                      {letter.content || '…'}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(200,160,70,0.08)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '11px', color: '#c8a030', letterSpacing: '0.5px' }}>
                      {isDraft ? '✎ Continue writing' : '✉ View sealed letter'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 20px', border: '1px dashed rgba(200,160,70,0.15)', borderRadius: '16px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.2 }}>✉</div>
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '24px', fontStyle: 'italic', color: '#8a7040', marginBottom: '8px' }}>Your desk is clear</h3>
            <p style={{ color: '#5a4830', fontSize: '12px', letterSpacing: '1px', marginBottom: '32px' }}>Take a seat and write your first letter.</p>
            <button
              onClick={handleWriteNew}
              disabled={createLetter.isPending}
              style={{ background: 'linear-gradient(135deg,#7a5010,#c8a030)', border: 'none', color: '#1a0f05', padding: '14px 36px', borderRadius: '10px', fontFamily: "'Special Elite',cursive", fontSize: '14px', cursor: 'pointer', letterSpacing: '1px' }}
            >
              ✦ Start Writing
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
