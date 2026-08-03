'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { formatRupiah, getTodayString } from '@/lib/utils';
import type { BankAccount } from '@/lib/types';
import { X, Loader2, AlertTriangle } from 'lucide-react';

type TxType = 'SETOR' | 'TARIK' | 'PIUTANG';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: TxType;
  editingTransaction?: any;
}

export default function AddTransactionModal({ isOpen, onClose, onSuccess, defaultType = 'SETOR', editingTransaction }: AddTransactionModalProps) {
  const { activeProfile, getDisplayName } = useProfile();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [txType, setTxType] = useState<TxType>(defaultType || 'SETOR');
  const [bankId, setBankId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');
  // Piutang fields
  const [debtorName, setDebtorName] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bankBalance, setBankBalance] = useState<number | null>(null);
  const [showNegativeWarning, setShowNegativeWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      loadBanks();
      if (editingTransaction) {
        setTxType(editingTransaction.type || 'SETOR');
        setBankId(editingTransaction.bank_account_id || '');
        setAmount(editingTransaction.amount?.toString() || '');
        setDate(editingTransaction.transaction_date || getTodayString());
        setNote(editingTransaction.note || '');
        setCategory(editingTransaction.category || '');
      } else {
        setTxType(defaultType || 'SETOR');
        setAmount('');
        setNote('');
        setCategory('');
        setDebtorName('');
        setDueDate('');
        setDate(getTodayString());
        setBankId('');
      }
      setBankBalance(null);
      setShowNegativeWarning(false);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultType, editingTransaction]);

  useEffect(() => {
    if (bankId && (txType === 'TARIK' || txType === 'PIUTANG')) {
      calculateBankBalance(bankId);
    } else {
      setBankBalance(null);
      setShowNegativeWarning(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankId, txType]);

  useEffect(() => {
    if (bankBalance !== null && amount) {
      const numAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;
      setShowNegativeWarning(numAmount > bankBalance);
    } else {
      setShowNegativeWarning(false);
    }
  }, [amount, bankBalance]);

  const loadBanks = async () => {
    const { data } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_archived', false)
      .order('bank_name');
    if (data) setBanks(data);
  };

  const calculateBankBalance = async (bid: string) => {
    // Get deposits
    const { data: deposits } = await supabase
      .from('transactions')
      .select('amount')
      .eq('bank_account_id', bid)
      .eq('type', 'SETOR');

    const totalDeposits = (deposits || []).reduce((s, t) => s + t.amount, 0);

    // Get withdrawals
    const { data: withdrawals } = await supabase
      .from('transactions')
      .select('amount')
      .eq('bank_account_id', bid)
      .eq('type', 'TARIK');

    const totalWithdrawals = (withdrawals || []).reduce((s, t) => s + t.amount, 0);

    // Get receivables (money lent out)
    const { data: receivables } = await supabase
      .from('receivables')
      .select('amount')
      .eq('bank_account_id', bid);

    const totalLent = (receivables || []).reduce((s, r) => s + r.amount, 0);

    // Get receivable payments back
    const { data: payments } = await supabase
      .from('receivable_payments')
      .select('amount')
      .eq('bank_account_id', bid);

    const totalPayments = (payments || []).reduce((s, p) => s + p.amount, 0);

    const balance = totalDeposits - totalWithdrawals - totalLent + totalPayments;
    setBankBalance(balance);
  };

  const handleAmountChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setAmount(digits);
  };

  const displayAmount = amount
    ? new Intl.NumberFormat('id-ID').format(parseInt(amount, 10) || 0)
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeProfile) return;

    const numAmount = parseInt(amount.replace(/\D/g, ''), 10);
    if (!numAmount || numAmount <= 0) {
      showToast('Nominal harus lebih dari 0', 'error');
      return;
    }
    if (!bankId) {
      showToast('Pilih rekening bank terlebih dahulu', 'error');
      return;
    }
    if (date > getTodayString()) {
      showToast('Tanggal tidak boleh melebihi hari ini', 'error');
      return;
    }

    setIsLoading(true);

    try {
      if (txType === 'PIUTANG') {
        if (!debtorName || debtorName.trim().length < 2) {
          showToast('Nama peminjam wajib diisi (min. 2 karakter)', 'error');
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.from('receivables').insert({
          user_id: user.id,
          bank_account_id: bankId,
          profile_name: activeProfile,
          debtor_name: debtorName.trim(),
          amount: numAmount,
          lent_date: date,
          due_date: dueDate || null,
          status: 'BELUM_LUNAS',
          note: note.trim() || null,
        });

        if (error) throw error;
        showToast(`Piutang ${debtorName} berhasil dicatat`, 'success');
      } else if (editingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update({
            bank_account_id: bankId,
            type: txType,
            amount: numAmount,
            transaction_date: date,
            note: note.trim() || null,
            category: txType === 'TARIK' ? (category.trim() || null) : null,
          })
          .eq('id', editingTransaction.id);

        if (error) throw error;
        showToast('Transaksi berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase.from('transactions').insert({
          user_id: user.id,
          bank_account_id: bankId,
          profile_name: activeProfile,
          type: txType,
          amount: numAmount,
          transaction_date: date,
          note: note.trim() || null,
          category: txType === 'TARIK' ? (category.trim() || null) : null,
        });

        if (error) throw error;
        showToast('Transaksi berhasil dicatat', 'success');
      }

      onSuccess();
      onClose();
    } catch {
      showToast('Gagal menyimpan, coba lagi', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const typeLabels: Record<TxType, string> = {
    SETOR: 'Setoran',
    TARIK: 'Penarikan',
    PIUTANG: 'Piutang Baru',
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Tambah Transaksi</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Type Selector */}
        <div className="tab-group" style={{ marginBottom: '20px' }}>
          {(['SETOR', 'TARIK', 'PIUTANG'] as TxType[]).map((t) => (
            <button
              key={t}
              className={`tab-item ${txType === t ? 'active' : ''}`}
              onClick={() => setTxType(t)}
              type="button"
            >
              {typeLabels[t]}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Bank Selection */}
          <div className="form-group">
            <label className="form-label">
              {txType === 'SETOR' ? 'Bank Tujuan' : 'Bank Sumber'}
            </label>
            <select
              className="form-input form-select"
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              required
            >
              <option value="">Pilih rekening bank</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.icon_emoji} {b.bank_name} {b.nickname ? `(${b.nickname})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">Nominal (Rp)</label>
            <input
              className="form-input"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={displayAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              required
              style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.01em' }}
            />
            {bankBalance !== null && (txType === 'TARIK' || txType === 'PIUTANG') && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Saldo tercatat: {formatRupiah(bankBalance)}
              </p>
            )}
          </div>

          {/* Negative Warning */}
          {showNegativeWarning && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              background: 'rgba(250, 204, 21, 0.1)',
              border: '1px solid rgba(250, 204, 21, 0.2)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              color: 'var(--yellow-400)',
            }}>
              <AlertTriangle size={16} />
              <span>Saldo tercatat akan menjadi negatif setelah transaksi ini</span>
            </div>
          )}

          {/* Piutang Fields */}
          {txType === 'PIUTANG' && (
            <>
              <div className="form-group">
                <label className="form-label">Nama Peminjam</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Nama orang yang meminjam"
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Jatuh Tempo (opsional)</label>
                <input
                  className="form-input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Withdrawal Category */}
          {txType === 'TARIK' && (
            <div className="form-group">
              <label className="form-label">Kategori (opsional)</label>
              <select
                className="form-input form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Tanpa kategori</option>
                <option value="Kebutuhan Mendesak">Kebutuhan Mendesak</option>
                <option value="Kesehatan">Kesehatan</option>
                <option value="Transportasi">Transportasi</option>
                <option value="Makanan">Makanan</option>
                <option value="Tagihan">Tagihan</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          )}

          {/* Date */}
          <div className="form-group">
            <label className="form-label">Tanggal</label>
            <input
              className="form-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={getTodayString()}
              required
            />
          </div>

          {/* Note */}
          <div className="form-group">
            <label className="form-label">Catatan (opsional)</label>
            <input
              className="form-input"
              type="text"
              placeholder="Tambah keterangan..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Profile Info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}>
            <span className="profile-avatar" style={{ width: '24px', height: '24px', fontSize: '12px' }}>
              {activeProfile === 'Kamu' ? '👦' : '👧'}
            </span>
            <span>Dicatat oleh: <strong>{getDisplayName(activeProfile)}</strong></span>
          </div>

          {/* Submit */}
          <button className="btn btn-primary btn-full" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Menyimpan...
              </>
            ) : (
              `Simpan ${typeLabels[txType]}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
