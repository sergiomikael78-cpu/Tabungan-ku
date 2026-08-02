'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { ToastProvider } from '@/components/Toast';
import AppShell from '@/components/AppShell';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <ToastProvider>
          <AppShell>
            {children}
          </AppShell>
        </ToastProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
