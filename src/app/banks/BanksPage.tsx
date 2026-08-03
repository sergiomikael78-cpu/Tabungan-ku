'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { formatRupiah } from '@/lib/utils';
import type { BankAccount, BankWithBalance } from '@/lib/types';
import { Plus, Pencil, Archive, Loader2 } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import PullToRefresh from '@/components/PullToRefresh';

const BANK_COLORS = [
  { value: '#10b981', label: '🟢 Hijau' },
  { value: '#3b82f6', label: '🔵 Biru' },
  { value: '#f59e0b', label: '🟡 Kuning' },
  { value: '#8b5cf6', label: '🟣 Ungu' },
  { value: '#ef4444', label: '🔴 Merah' },
  { value: '#ec4899', label: '🩷 Pink' },
  { value: '#06b6d4', label: '🩵 Cyan' },
  { value: '#84cc16', label: '💚 Lime' },
];

const BANK_ICONS = ['🏦', '💳', '🏧', '💰', '🪙', '📱', '🌐', '⭐'];

export default function BanksPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [banks, setBanks] = useState<BankWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<BankAccount | null>(null);

  // Form state
  const [bankName, setBankName] = useState('');
  const [nickname, setNickname] = useState('');
  const [colorTag, setColorTag] = useState('#10b981');
  const [iconEmoji, setIconEmoji] = useState('🏦');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBanks = useCallback(async () => {
    const { data: bankData } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_archived', false)
      .order('bank_name');

    if (!bankData) { setIsLoading(false); return; }

    const banksWithBalance: BankWithBalance[] = [];
    for (const bank of bankData) {
      const { data: deps } = await supabase.from('transactions').select('amount').eq('bank_account_id', bank.id).eq('type', 'SETOR');
      const { data: wds } = await supabase.from('transactions').select('amount').eq('bank_account_id', bank.id).eq('type', 'TARIK');
      const { data: recs } = await supabase.from('receivables').select('amount').eq('bank_account_id', bank.id);
      const { data: pays } = await supabase.from('receivable_payments').select('amount').eq('bank_account_id', bank.id);

      const balance =
        (deps || []).reduce((s, t) => s + t.amount, 0) -
        (wds || []).reduce((s, t) => s + t.amount, 0) -
        (recs || []).reduce((s, r) => s + r.amount, 0) +
        (pays || []).reduce((s, p) => s + p.amount, 0);

      banksWithBalance.push({ ...bank, balance });
    }

    setBanks(banksWithBalance);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadBanks(); }, [loadBanks]);

  const resetForm = () => {
    setBankName('');
    setNickname('');
    setColorTag('#10b981');
    setIconEmoji('🏦');
    setEditingBank(null);
    setShowForm(false);
  };

  const openEditForm = (bank: BankAccount) => {
    setEditingBank(bank);
    setBankName(bank.bank_name);
    setNickname(bank.nickname || '');
    setColorTag(bank.color_tag);
    setIconEmoji(bank.icon_emoji || '🏦');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bankName.trim()) return;
    setIsSubmitting(true);

    try {
      if (editingBank) {
        const { error } = await supabase
          .from('bank_accounts')
          .update({
            bank_name: bankName.trim(),
            nickname: nickname.trim() || null,
            color_tag: colorTag,
            icon_emoji: iconEmoji,
          })
          .eq('id', editingBank.id);
        if (error) throw error;
        showToast('Rekening bank berhasil diperbarui', 'success');
      } else {
        // Check duplicate
        const { data: existing } = await supabase
          .from('bank_accounts')
          .select('id')
          .eq('bank_name', bankName.trim())
          .eq('is_archived', false)
          .single();
        
        if (existing) {
          showToast('Nama rekening sudah digunakan', 'error');
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase.from('bank_accounts').insert({
          user_id: user.id,
          bank_name: bankName.trim(),
          nickname: nickname.trim() || null,
          color_tag: colorTag,
          icon_emoji: iconEmoji,
          is_archived: false,
        });
        if (error) throw error;
        showToast('Rekening bank berhasil ditambahkan', 'success');
      }
      resetForm();
      loadBanks();
    } catch {
      showToast('Gagal menyimpan, coba lagi', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!confirmArchive) return;
    const { error } = await supabase
      .from('bank_accounts')
      .update({ is_archived: true })
      .eq('id', confirmArchive.id);
    
    if (error) {
      showToast('Gagal mengarsipkan bank', 'error');
    } else {
      showToast('Rekening berhasil diarsipkan', 'success');
      loadBanks();
    }
    setConfirmArchive(null);
  };

  return (
    <>
      <PullToRefresh onRefresh={loadBanks}>
        <div className="page-container">
      <div className="page-header">
        <h1 style={{ fontSize: '20px', fontWeight: 700, flex: 1 }}>Rekening Bank</h1>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => { resetForm(); setShowForm(true); }}
        >
          <Plus size={16} /> Tambah
        </button>
      </div>

      {/* Bank List */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
          ))
        ) : banks.length > 0 ? (
          banks.map((bank) => (
            <div key={bank.id} className="glass-card bank-list-item">
              <div className="bank-list-left">
                <div 
                  className="bank-list-icon" 
                  style={{ background: `${bank.color_tag}22` }}
                >
                  {bank.icon_emoji || '🏦'}
                </div>
                <div className="bank-list-info">
                  <p className="bank-list-name">{bank.bank_name}</p>
                  {bank.nickname && (
                    <p className="bank-list-nickname">{bank.nickname}</p>
                  )}
                  <p 
                    className="bank-list-balance" 
                    style={{ color: bank.balance >= 0 ? 'var(--accent-emerald)' : 'var(--red-400)' }}
                  >
                    {formatRupiah(bank.balance)}
                  </p>
                </div>
              </div>
              <div className="bank-list-actions">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => openEditForm(bank)}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => setConfirmArchive(bank)}
                >
                  <Archive size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <span className="empty-state-icon">🏦</span>
            <p className="empty-state-title">Belum ada rekening bank</p>
            <p className="empty-state-text">Tambahkan rekening pertama kalian untuk mulai mencatat tabungan.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
      </PullToRefresh>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="modal-backdrop" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
              {editingBank ? 'Edit Rekening' : 'Tambah Rekening'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nama Bank</label>
                <input
                  className="form-input"
                  placeholder="Contoh: BCA, SeaBank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nickname / Label (opsional)</label>
                <input
                  className="form-input"
                  placeholder="Contoh: Tabungan utama"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ikon</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {BANK_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className="icon-selector-btn"
                      onClick={() => setIconEmoji(icon)}
                      style={{
                        background: iconEmoji === icon ? 'var(--accent-emerald)22' : 'var(--bg-card)',
                        border: `2px solid ${iconEmoji === icon ? 'var(--accent-emerald)' : 'var(--border-default)'}`,
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Warna Penanda</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {BANK_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className="color-selector-btn"
                      onClick={() => setColorTag(c.value)}
                      style={{
                        background: c.value,
                        border: `3px solid ${colorTag === c.value ? 'white' : 'transparent'}`,
                        boxShadow: colorTag === c.value ? `0 0 0 2px ${c.value}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={resetForm} style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ flex: 1 }}>
                  {isSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  {editingBank ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmArchive}
        title="Arsipkan Rekening?"
        message={`Rekening "${confirmArchive?.bank_name}" akan diarsipkan. Riwayat transaksi tetap tersimpan, tapi rekening tidak akan muncul lagi di daftar.`}
        confirmText="Ya, Arsipkan"
        onConfirm={handleArchive}
        onCancel={() => setConfirmArchive(null)}
      />
    </>
  );
}
