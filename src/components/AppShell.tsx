'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import BottomNav from '@/components/BottomNav';
import AddTransactionModal from '@/components/AddTransactionModal';
import LoginPage from '@/app/login/LoginPage';
import ProfileSelectPage from '@/app/profile-select/ProfileSelectPage';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { session, isLoading: authLoading } = useAuth();
  const { activeProfile } = useProfile();
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

  return (
    <>
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
