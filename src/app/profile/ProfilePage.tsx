'use client';

import React, { useState, useEffect } from 'react';
import { useProfile } from '@/context/ProfileContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { User, RefreshCw, Lock, LogOut, Download, ChevronRight, Loader2, Edit3 } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function ProfilePage() {
  const { activeProfile, profileEmoji, setActiveProfile, clearProfile, displayNames, getDisplayName, updateDisplayNames } = useProfile();
  const { signOut, user } = useAuth();
  const { showToast } = useToast();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [showNameModal, setShowNameModal] = useState(false);
  const [nameKamu, setNameKamu] = useState('');
  const [namePacar, setNamePacar] = useState('');
  const [isSavingNames, setIsSavingNames] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    setNameKamu(displayNames.Kamu);
    setNamePacar(displayNames.Pacar);
  }, [displayNames]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleSwitchProfile = () => {
    const newProfile = activeProfile === 'Kamu' ? 'Pacar' : 'Kamu';
    setActiveProfile(newProfile);
    showToast(`Profil diganti ke ${getDisplayName(newProfile)}`, 'success');
  };

  const handleSaveDisplayNames = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKamu = nameKamu.trim();
    const trimmedPacar = namePacar.trim();

    if (trimmedKamu.length < 2 || trimmedKamu.length > 30) {
      showToast('Nama profil Kamu wajib 2-30 karakter', 'error');
      return;
    }

    if (trimmedPacar.length < 2 || trimmedPacar.length > 30) {
      showToast('Nama profil Pacar wajib 2-30 karakter', 'error');
      return;
    }

    setIsSavingNames(true);
    const success = await updateDisplayNames(trimmedKamu, trimmedPacar);
    setIsSavingNames(false);

    if (success) {
      showToast('Nama profil berhasil disimpan', 'success');
      setShowNameModal(false);
    } else {
      showToast('Gagal menyimpan nama profil, coba lagi', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('Password minimal 8 karakter', 'error');
      return;
    }
    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      showToast('Gagal mengganti password', 'error');
    } else {
      showToast('Password berhasil diubah', 'success');
      setShowPasswordForm(false);
      setNewPassword('');
    }
    setIsUpdatingPassword(false);
  };

  const handleLogout = async () => {
    clearProfile();
    await signOut();
  };

  const handleInstall = () => {
    const promptObj = deferredPrompt || (window as unknown as { deferredPrompt?: { prompt: () => void } }).deferredPrompt;
    if (promptObj) {
      promptObj.prompt();
    } else {
      showToast('Gunakan menu browser → "Add to Home Screen"', 'info');
    }
  };

  const currentActiveName = activeProfile ? getDisplayName(activeProfile) : '';

  const menuItems = [
    {
      icon: <Edit3 size={18} />,
      label: 'Nama Tampilan Profil',
      desc: `Kamu: ${displayNames.Kamu} • Pacar: ${displayNames.Pacar}`,
      onClick: () => setShowNameModal(true),
    },
    {
      icon: <RefreshCw size={18} />,
      label: 'Ganti Profil Aktif',
      desc: `Saat ini: ${currentActiveName}`,
      onClick: handleSwitchProfile,
    },
    {
      icon: <Lock size={18} />,
      label: 'Ganti Password',
      desc: 'Ubah password akun bersama',
      onClick: () => setShowPasswordForm(true),
    },
    {
      icon: <Download size={18} />,
      label: 'Install Aplikasi',
      desc: 'Pasang ke Home Screen',
      onClick: handleInstall,
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Profil & Pengaturan</h1>
      </div>

      {/* Profile Card */}
      <div style={{ padding: '16px' }}>
        <div className="glass-card profile-hero">
          <div className="profile-avatar-lg">
            {profileEmoji}
          </div>
          <div className="profile-info">
            <p className="profile-name">{currentActiveName}</p>
            <p className="profile-email">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="glass-card menu-list">
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className="menu-item"
            >
              <div className="menu-icon-wrap">
                {item.icon}
              </div>
              <div className="menu-text-wrap">
                <p className="menu-title">{item.label}</p>
                <p className="menu-desc">{item.desc}</p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div style={{ padding: '0 16px 16px' }}>
        <button
          className="btn btn-danger btn-full"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <LogOut size={16} /> Keluar
        </button>
      </div>

      {/* App Info */}
      <div className="app-footer">
        <p>Saving Vision v1.0</p>
        <p>Saving Together, Growing Together 💚</p>
      </div>

      {/* Modal Ubah Nama Tampilan Profil */}
      {showNameModal && (
        <div className="modal-backdrop" onClick={() => setShowNameModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Nama Tampilan Profil</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Ubah nama tampilan untuk kedua profil. Tersinkronisasi secara otomatis ke pasangan.
            </p>
            <form onSubmit={handleSaveDisplayNames} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">👦 Nama Tampilan "Kamu"</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Contoh: Sergio"
                  value={nameKamu}
                  onChange={(e) => setNameKamu(e.target.value)}
                  maxLength={30}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">👧 Nama Tampilan "Pacar"</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Contoh: Mikael"
                  value={namePacar}
                  onChange={(e) => setNamePacar(e.target.value)}
                  maxLength={30}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNameModal(false)} style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSavingNames} style={{ flex: 1 }}>
                  {isSavingNames ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  Simpan Nama
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Form Modal */}
      {showPasswordForm && (
        <div className="modal-backdrop" onClick={() => setShowPasswordForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Ganti Password</h2>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Password Baru</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordForm(false)} style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUpdatingPassword} style={{ flex: 1 }}>
                  {isUpdatingPassword ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <ConfirmDialog
          isOpen={showLogoutConfirm}
          title="Keluar dari Akun?"
          message="Apakah kamu yakin ingin keluar dari sesi di perangkat ini?"
          confirmText="Ya, Keluar"
          cancelText="Batal"
          variant="danger"
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
