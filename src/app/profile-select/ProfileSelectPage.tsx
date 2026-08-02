'use client';

import React from 'react';
import { useProfile } from '@/context/ProfileContext';

export default function ProfileSelectPage() {
  const { setActiveProfile, getDisplayName } = useProfile();

  const profiles = [
    { name: 'Kamu' as const, emoji: '👦', desc: 'Profil pertama', color: '#10b981' },
    { name: 'Pacar' as const, emoji: '👧', desc: 'Profil kedua', color: '#ec4899' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      padding: '24px',
      background: 'var(--bg-primary)',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤝</div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
          Siapa yang pakai?
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '280px' }}>
          Pilih profil untuk perangkat ini. Setiap transaksi yang kamu catat akan otomatis ditandai dengan profilmu.
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '16px',
        width: '100%',
        maxWidth: '360px',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {profiles.map((p) => (
          <button
            key={p.name}
            onClick={() => setActiveProfile(p.name)}
            className="glass-card"
            style={{
              flex: 1,
              padding: '28px 20px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = p.color;
              e.currentTarget.style.boxShadow = `0 0 20px ${p.color}22`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              fontSize: '48px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${p.color}15`,
              border: `2px solid ${p.color}33`,
            }}>
              {p.emoji}
            </div>
            <div>
              <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {getDisplayName(p.name)}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
