'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useProfile } from '@/context/ProfileContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { RefreshCw, LogOut, Lock, Download, Edit3, ChevronRight, Palette, Check, Loader2, Camera, Upload, Trash2, Sliders, RotateCcw, Eye } from 'lucide-react';
import Image from 'next/image';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function ProfilePage() {
  const {
    activeProfile,
    profileEmoji,
    setActiveProfile,
    clearProfile,
    displayNames,
    getDisplayName,
    updateDisplayNames,
    currentAppearance,
    updateAppearancePreset,
    uploadCustomBackground,
    uploadCustomAvatar,
    removeCustomAvatar,
    updateAppearanceEffects,
    setLocalAppearanceEffects,
    setLocalAppearancePreset,
    revertLocalAppearance,
  } = useProfile();
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

  const [showPresetModal, setShowPresetModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(currentAppearance?.bg_value || '/backgrounds/preset-01.webp');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [opacityVal, setOpacityVal] = useState<number>(currentAppearance?.overlay_opacity ?? 0.40);
  const [blurVal, setBlurVal] = useState<number>(currentAppearance?.blur_amount ?? 12);
  const [isSavingEffects, setIsSavingEffects] = useState(false);

  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    setNameKamu(displayNames.Kamu);
    setNamePacar(displayNames.Pacar);
  }, [displayNames]);

  useEffect(() => {
    if (currentAppearance) {
      setSelectedPreset(currentAppearance.bg_value || '/backgrounds/preset-01.webp');
      setOpacityVal(currentAppearance.overlay_opacity ?? 0.40);
      setBlurVal(currentAppearance.blur_amount ?? 12);
    }
  }, [currentAppearance]);

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

  const PRESET_LIST = Array.from({ length: 15 }, (_, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    return `/backgrounds/preset-${num}.webp`;
  });

  const handleSelectPreset = (presetPath: string) => {
    setSelectedPreset(presetPath);
    setLocalAppearancePreset(presetPath);
  };

  const handleClosePresetModal = () => {
    revertLocalAppearance();
    setShowPresetModal(false);
  };

  const handleOpacityChange = (newVal: number) => {
    setOpacityVal(newVal);
    setLocalAppearanceEffects(newVal, blurVal);
  };

  const handleBlurChange = (newVal: number) => {
    setBlurVal(newVal);
    setLocalAppearanceEffects(opacityVal, newVal);
  };

  const handleSavePreset = async () => {
    setIsSavingPreset(true);
    const ok = await updateAppearancePreset(selectedPreset, opacityVal, blurVal);
    if (ok) {
      showToast(`Personalisasi profil ${currentActiveName} berhasil disimpan!`, 'success');
      setShowPresetModal(false);
    } else {
      showToast('Gagal menyimpan personalisasi', 'error');
    }
    setIsSavingPreset(false);
  };

  const handleResetEffects = () => {
    handleOpacityChange(0.40);
    handleBlurChange(12);
  };

  const handleCustomBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBg(true);
    const res = await uploadCustomBackground(file);
    if (res.success && res.url) {
      setSelectedPreset(res.url);
      showToast('Background kustom berhasil diupload!', 'success');
      setShowPresetModal(false);
    } else {
      showToast(res.error || 'Gagal mengupload background kustom', 'error');
    }
    setIsUploadingBg(false);
    if (bgFileInputRef.current) bgFileInputRef.current.value = '';
  };

  const handleCustomAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const res = await uploadCustomAvatar(file);
    if (res.success) {
      showToast(`Avatar profil ${currentActiveName} berhasil diperbarui!`, 'success');
    } else {
      showToast(res.error || 'Gagal mengupload avatar', 'error');
    }
    setIsUploadingAvatar(false);
    if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
  };

  const handleRemoveAvatar = async () => {
    const ok = await removeCustomAvatar();
    if (ok) {
      showToast('Avatar kustom dihapus (kembali ke emoji)', 'info');
    } else {
      showToast('Gagal menghapus avatar', 'error');
    }
  };

  const menuItems = [
    {
      icon: <Palette size={18} />,
      label: 'Personalisasi Background',
      desc: `Preset aktif: ${currentAppearance?.bg_value?.split('/')?.pop() || 'preset-01.webp'}`,
      onClick: () => {
        setSelectedPreset(currentAppearance?.bg_value || '/backgrounds/preset-01.webp');
        setShowPresetModal(true);
      },
    },
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

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={bgFileInputRef}
        onChange={handleCustomBgUpload}
        accept="image/png, image/jpeg, image/webp"
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={avatarFileInputRef}
        onChange={handleCustomAvatarUpload}
        accept="image/png, image/jpeg, image/webp"
        style={{ display: 'none' }}
      />

      {/* Profile Card */}
      <div style={{ padding: '16px' }}>
        <div className="glass-card profile-hero" style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <div className="profile-avatar-lg" style={{ overflow: 'hidden', position: 'relative' }}>
              {currentAppearance?.avatar_url ? (
                <Image
                  src={currentAppearance.avatar_url}
                  alt="Avatar Profil"
                  fill
                  sizes="80px"
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
              ) : (
                profileEmoji
              )}
            </div>
            <button
              onClick={() => avatarFileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--accent-emerald)',
                color: '#fff',
                border: '2px solid var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}
              title="Ubah Foto Avatar"
            >
              {isUploadingAvatar ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={14} />}
            </button>
          </div>

          <div className="profile-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <p className="profile-name">{currentActiveName}</p>
              {currentAppearance?.avatar_url && (
                <button
                  onClick={handleRemoveAvatar}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                  title="Hapus foto avatar (kembali ke emoji)"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
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

      {/* Modal Ubah Background Preset */}
      {showPresetModal && (
        <div className="modal-backdrop" onClick={handleClosePresetModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-handle" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>🖼️ Galeri Background Preset</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Klik preset untuk preview langsung, lalu klik Simpan Background (tersimpan terpisah per profil).
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={() => bgFileInputRef.current?.click()}
                disabled={isUploadingBg}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderStyle: 'dashed' }}
              >
                {isUploadingBg ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Mengupload Foto...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload Foto Background Sendiri (Max 5MB)
                  </>
                )}
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}>
              {PRESET_LIST.map((presetPath, idx) => {
                const isSelected = selectedPreset === presetPath;
                return (
                  <div
                    key={presetPath}
                    onClick={() => handleSelectPreset(presetPath)}
                    style={{
                      position: 'relative',
                      aspectRatio: '16/9',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--accent-emerald)' : '1px solid var(--border-light)',
                      boxShadow: isSelected ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Image
                      src={presetPath}
                      alt={`Preset ${idx + 1}`}
                      fill
                      sizes="200px"
                      style={{ objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 0, 0, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isSelected && (
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'var(--accent-emerald)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                        }}>
                          <Check size={16} />
                        </div>
                      )}
                    </div>
                    <span style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#fff',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                    }}>
                      Preset {idx + 1}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Sliders Pengaturan Blur & Kontras Overlay */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              border: '1px solid var(--border-light)',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sliders size={16} style={{ color: 'var(--accent-emerald)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Pengaturan Blur & Kontras</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetEffects}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={12} /> Reset (Default)
                </button>
              </div>

              {/* Slider 1: Opacity Overlay */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span>Kegelapan Overlay Teks (WCAG AA)</span>
                  <strong style={{ color: 'var(--accent-emerald)' }}>{Math.round(opacityVal * 100)}%</strong>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.9"
                  step="0.05"
                  value={opacityVal}
                  onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-emerald)', cursor: 'pointer' }}
                />
              </div>

              {/* Slider 2: Blur Amount */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span>Intensitas Blur Glassmorphism</span>
                  <strong style={{ color: 'var(--accent-emerald)' }}>{blurVal}px</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={blurVal}
                  onChange={(e) => handleBlurChange(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--accent-emerald)', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div style={{
              position: 'sticky',
              bottom: 0,
              left: 0,
              right: 0,
              paddingTop: '12px',
              paddingBottom: '4px',
              background: 'linear-gradient(to top, rgba(17, 26, 22, 0.98) 85%, transparent)',
              display: 'flex',
              gap: '10px',
              marginTop: 'auto',
              zIndex: 10,
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={handleClosePresetModal}
                disabled={isSavingPreset}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleSavePreset}
                disabled={isSavingPreset}
              >
                {isSavingPreset ? 'Menyimpan...' : 'Simpan Background'}
              </button>
            </div>
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
