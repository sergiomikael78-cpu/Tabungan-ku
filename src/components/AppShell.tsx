'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import BottomNav from '@/components/BottomNav';
import AddTransactionModal from '@/components/AddTransactionModal';
import LoginPage from '@/app/login/LoginPage';
import ProfileSelectPage from '@/app/profile-select/ProfileSelectPage';

function getDeterministicAnimClass(bgUrl: string): string {
  let hash = 0;
  for (let i = 0; i < bgUrl.length; i++) {
    hash = (hash << 5) - hash + bgUrl.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % 4;
  const variants = ['bg-anim-ken-burns', 'bg-anim-drift-h', 'bg-anim-pulse', 'bg-anim-drift-v'];
  return variants[index];
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { session, isLoading: authLoading } = useAuth();
  const { activeProfile, currentAppearance } = useProfile();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Loading splash
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        gap: '16px',
      }}>
        <div style={{ fontSize: '48px' }}>💰</div>
        <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-emerald)' }}>Saving Vision</p>
        <div className="skeleton" style={{ width: '120px', height: '4px' }} />
      </div>
    );
  }

  // Not logged in
  if (!session) {
    return <LoginPage />;
  }

  // No profile selected
  if (!activeProfile) {
    return <ProfileSelectPage />;
  }

  const handleTransactionSuccess = () => {
    setRefreshKey((k) => k + 1);
    // Dispatch a custom event for real-time refresh across pages
    window.dispatchEvent(new CustomEvent('transaction-update'));
  };

  const bgImage = currentAppearance?.bg_value || '/backgrounds/preset-01.webp';
  const overlayOpacity = currentAppearance?.overlay_opacity ?? 0.40;
  const blurAmount = currentAppearance?.blur_amount ?? 12;
  const accentColor = currentAppearance?.accent_color || '#10b981';
  const accentColorSecondary = currentAppearance?.accent_color_secondary || '#047857';

  const animClass = getDeterministicAnimClass(bgImage);

  React.useEffect(() => {
    document.documentElement.style.setProperty('--card-blur', `${blurAmount}px`);
    document.documentElement.style.setProperty('--dynamic-accent', accentColor);
    document.documentElement.style.setProperty('--dynamic-accent-secondary', accentColorSecondary);
  }, [blurAmount, accentColor, accentColorSecondary]);

  return (
    <>
      {/* Dynamic Background Layer per Profile (Sharp & Crisp with GPU Animation) */}
      <div
        className={`app-bg-fixed ${animClass}`}
        style={{
          backgroundImage: `url('${bgImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'fixed',
          inset: 0,
          zIndex: -2,
          transition: 'background-image 0.4s ease-in-out',
        }}
      />
      {/* Scrim Dark Gradient Overlay Layer (Base contrast, NO BLUR) */}
      <div
        className="app-overlay-fixed"
        style={{
          background: `linear-gradient(180deg, rgba(10, 15, 13, ${overlayOpacity * 0.35}) 0%, rgba(10, 15, 13, ${overlayOpacity * 0.75}) 100%)`,
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          transition: 'background 0.3s ease',
        }}
      />
      <div key={refreshKey}>
        {children}
      </div>
      <BottomNav onAddClick={() => setIsModalOpen(true)} />
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleTransactionSuccess}
      />
    </>
  );
}
