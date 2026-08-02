'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { useToast } from '@/components/Toast';
import { formatRupiah, formatDate, getDaysUntilDue, getTodayString } from '@/lib/utils';
import type { Receivable, ReceivablePayment, BankAccount } from '@/lib/types';
import { ArrowLeft, Loader2, Plus, Calendar, User, Landmark, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/ConfirmDialog';
import PullToRefresh from '@/components/PullToRefresh';

export default function ReceivableDetailPage() {
  const params = useParams();
  const recId = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { activeProfile, getDisplayName } = useProfile();
  const { showToast } = useToast();

  const [receivable, setReceivable] = useState<Receivable | null>(null);
  const [payments, setPayments] = useState<ReceivablePayment[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Payment form
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payBankId, setPayBankId] = useState('');
  const [payDate, setPayDate] = useState(getTodayString());
  const [payNote, setPayNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form
  const [showEditForm, setShowEditForm] = useState(false);
  const [editDebtorName, setEditDebtorName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

  const handleDeleteReceivable = async () => {
    if (!receivable) return;
    const { error } = await supabase.from('receivables').delete().eq('id', receivable.id);
    if (error) {
      showToast('Gagal menghapus piutang', 'error');
    } else {
      showToast('Catatan piutang berhasil dihapus', 'success');
      window.dispatchEvent(new CustomEvent('transaction-update'));
      router.push('/receivables');
    }
  };

  const handleOpenEdit = () => {
    if (!receivable) return;
    setEditDebtorName(receivable.debtor_name);
    setEditAmount(receivable.amount.toString());
    setEditDueDate(receivable.due_date || '');
    setEditNote(receivable.note || '');
    setShowEditForm(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivable) return;

    if (!editDebtorName || editDebtorName.trim().length < 2) {
      showToast('Nama peminjam wajib diisi (min. 2 karakter)', 'error');
      return;
    }

    const numAmount = parseInt(editAmount.replace(/\D/g, ''), 10);
    if (!numAmount || numAmount <= 0) {
      showToast('Nominal piutang harus lebih dari 0', 'error');
      return;
    }

    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    if (numAmount < totalPaid) {
      showToast(`Nominal baru (${formatRupiah(numAmount)}) tidak boleh kurang dari total yang sudah dicicil (${formatRupiah(totalPaid)})`, 'error');
      return;
    }

    setIsEditingSubmitting(true);

    try {
      const { error } = await supabase
        .from('receivables')
        .update({
          debtor_name: editDebtorName.trim(),
          amount: numAmount,
          due_date: editDueDate || null,
          note: editNote.trim() || null,
        })
        .eq('id', receivable.id);

      if (error) throw error;

      showToast('Catatan piutang berhasil diperbarui', 'success');
      setShowEditForm(false);
      window.dispatchEvent(new CustomEvent('transaction-update'));
      loadData();
    } catch {
      showToast('Gagal memperbarui piutang, coba lagi', 'error');
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = receivable ? receivable.amount - totalPaid : 0;
  const progressPct = receivable && receivable.amount > 0 ? (totalPaid / receivable.amount) * 100 : 0;
  const daysUntil = receivable ? getDaysUntilDue(receivable.due_date) : null;

  const loadData = useCallback(async () => {
    if (!recId) return;

    const { data: recData } = await supabase
      .from('receivables')
      .select('*, bank_accounts(*)')
      .eq('id', recId)
      .single();

    if (recData) setReceivable(recData);

    const { data: payData } = await supabase
      .from('receivable_payments')
      .select('*, bank_accounts(*)')
      .eq('receivable_id', recId)
      .order('payment_date', { ascending: false });

    setPayments(payData || []);

    const { data: bankData } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_archived', false)
      .order('bank_name');
    setBanks(bankData || []);

    setIsLoading(false);
  }, [recId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeProfile || !receivable) return;

    const numAmount = parseInt(payAmount.replace(/\D/g, ''), 10);
    if (!numAmount || numAmount <= 0) {
      showToast('Nominal harus lebih dari 0', 'error');
      return;
    }
    if (numAmount > remaining) {
      showToast(`Nominal melebihi sisa piutang (${formatRupiah(remaining)})`, 'error');
      return;
    }
    if (!payBankId) {
      showToast('Pilih rekening bank tujuan penerimaan', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert payment
      const { error: payError } = await supabase.from('receivable_payments').insert({
        receivable_id: recId,
        bank_account_id: payBankId,
        profile_name: activeProfile,
        amount: numAmount,
        payment_date: payDate,
        note: payNote.trim() || null,
      });

      if (payError) throw payError;

      // Update receivable status
      const newTotalPaid = totalPaid + numAmount;
      const newStatus = newTotalPaid >= receivable.amount ? 'LUNAS' : 'SEBAGIAN';

      const { error: updateError } = await supabase
        .from('receivables')
        .update({ status: newStatus })
        .eq('id', recId);

      if (updateError) throw updateError;

      if (newStatus === 'LUNAS') {
        showToast(`Piutang ${receivable.debtor_name} telah lunas 🎉`, 'info');
      } else {
        showToast('Pelunasan berhasil dicatat', 'success');
      }

      setShowPayForm(false);
      setPayAmount('');
      setPayNote('');
      loadData();
      window.dispatchEvent(new CustomEvent('transaction-update'));
    } catch {
      showToast('Gagal menyimpan pelunasan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayPayAmount = payAmount
    ? new Intl.NumberFormat('id-ID').format(parseInt(payAmount, 10) || 0)
    : '';

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="detail-header">
          <Link href="/receivables" className="detail-back-btn" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className="detail-title">Memuat...</h1>
        </div>
        <div style={{ padding: '16px' }}>
          <div className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} />
        </div>
      </div>
    );
  }

  if (!receivable) return null;

  const statusConfig = {
    BELUM_LUNAS: { label: 'Belum Lunas', className: 'badge-danger' },
    SEBAGIAN: { label: 'Lunas Sebagian', className: 'badge-warning' },
    LUNAS: { label: 'Lunas', className: 'badge-success' },
  };
  const status = statusConfig[receivable.status];
  const isOverdue = daysUntil !== null && daysUntil < 0 && receivable.status !== 'LUNAS';

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="page-container">
      <div className="detail-header">
        <Link href="/receivables" className="detail-back-btn" style={{ textDecoration: 'none' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="detail-title" style={{ flex: 1 }}>Detail Piutang</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleOpenEdit}
            className="btn-icon"
            title="Edit Piutang"
          >
            <Pencil size={20} />
          </button>
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="btn-icon danger"
            title="Hapus Piutang"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div style={{ padding: '16px' }}>
        <div className="glass-card rec-detail-hero">
          <div className="rec-detail-header">
            <div>
              <p className="rec-detail-name">{receivable.debtor_name}</p>
              <span className={`badge ${status.className}`} style={{ marginTop: '4px' }}>{status.label}</span>
            </div>
            <p className="rec-detail-amount">
              {formatRupiah(receivable.amount)}
            </p>
          </div>

          {/* Progress */}
          <div className="rec-detail-progress">
            <div className="rec-detail-progress-text">
              <span>Terbayar: {formatRupiah(totalPaid)}</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(progressPct, 100)}%` }} />
            </div>
            <p className="rec-detail-remaining">
              Sisa: {formatRupiah(remaining)}
            </p>
          </div>

          {/* Details */}
          <div className="rec-detail-info">
            <div className="rec-info-item">
              <Calendar size={14} />
              <span>Dipinjamkan: {formatDate(receivable.lent_date)}</span>
            </div>
            {receivable.due_date && (
              <div className="rec-info-item" style={{
                color: isOverdue ? 'var(--red-400)' : 'var(--text-muted)',
                fontWeight: isOverdue ? 600 : 400,
              }}>
                <Calendar size={14} />
                <span>
                  Jatuh tempo: {formatDate(receivable.due_date)}
                  {isOverdue && ` (lewat ${Math.abs(daysUntil!)} hari)`}
                </span>
              </div>
            )}
            {receivable.bank_accounts && (
              <div className="rec-info-item">
                <Landmark size={14} />
                <span>Dari: {receivable.bank_accounts.bank_name}</span>
              </div>
            )}
            <div className="rec-info-item">
              <User size={14} />
              <span>Dicatat oleh: {getDisplayName(receivable.profile_name)}</span>
            </div>
          </div>

          {receivable.note && (
            <p className="rec-note">
              📝 {receivable.note}
            </p>
          )}
        </div>
      </div>

      {/* Record Payment Button */}
      {receivable.status !== 'LUNAS' && (
        <div style={{ padding: '0 16px 16px' }}>
          <button
            className="btn btn-primary btn-full"
            onClick={() => setShowPayForm(true)}
          >
            <Plus size={18} /> Catat Pelunasan
          </button>
        </div>
      )}

      {/* Payment History */}
      <div className="detail-section">
        <p className="section-title" style={{ padding: 0, marginBottom: '8px' }}>
          Riwayat Pelunasan
        </p>
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {payments.length > 0 ? (
            payments.map((pay) => (
              <div key={pay.id} className="transaction-item">
                <div className="tx-icon pelunasan">💸</div>
                <div style={{ flex: 1 }}>
                  <p className="tx-amount positive" style={{ fontSize: '14px', marginBottom: '2px' }}>
                    +{formatRupiah(pay.amount)}
                  </p>
                  <p className="tx-meta" style={{ fontSize: '12px' }}>
                    {formatDate(pay.payment_date)}
                    {pay.bank_accounts && ` • Ke ${pay.bank_accounts.bank_name}`}
                  </p>
                  {pay.note && (
                    <p className="tx-note" style={{ fontSize: '12px', marginTop: '2px' }}>
                      {pay.note}
                    </p>
                  )}
                </div>
                <span className="profile-avatar" title={getDisplayName(pay.profile_name)}>
                  {pay.profile_name === 'Kamu' ? '👦' : '👧'}
                </span>
              </div>
            ))
          ) : (
            <div className="empty-state" style={{ padding: '24px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Belum ada pelunasan dicatat.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPayForm && (
        <div className="modal-backdrop" onClick={() => setShowPayForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Catat Pelunasan</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Sisa piutang: <strong style={{ color: 'var(--text-primary)' }}>{formatRupiah(remaining)}</strong>
            </p>

            <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nominal Pelunasan (Rp)</label>
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={displayPayAmount}
                  onChange={(e) => setPayAmount(e.target.value.replace(/\D/g, ''))}
                  required
                  style={{ fontSize: '20px', fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bank Tujuan Penerimaan</label>
                <select
                  className="form-input form-select"
                  value={payBankId}
                  onChange={(e) => setPayBankId(e.target.value)}
                  required
                >
                  <option value="">Pilih rekening bank</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.icon_emoji} {b.bank_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tanggal Pelunasan</label>
                <input
                  className="form-input"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  max={getTodayString()}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Catatan (opsional)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Keterangan pelunasan..."
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayForm(false)} style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ flex: 1 }}>
                  {isSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Piutang */}
      {showEditForm && (
        <div className="modal-backdrop" onClick={() => setShowEditForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Edit Catatan Piutang</h2>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nama Peminjam</label>
                <input
                  className="form-input"
                  type="text"
                  value={editDebtorName}
                  onChange={(e) => setEditDebtorName(e.target.value)}
                  placeholder="Nama peminjam..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nominal Piutang (Rp)</label>
                <input
                  className="form-input"
                  type="text"
                  value={editAmount ? new Intl.NumberFormat('id-ID').format(parseInt(editAmount.replace(/\D/g, '') || '0', 10)) : ''}
                  onChange={(e) => setEditAmount(e.target.value.replace(/\D/g, ''))}
                  placeholder="100.000"
                  required
                />
                {totalPaid > 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--amber-400)', marginTop: '4px' }}>
                    ⚠️ Min. {formatRupiah(totalPaid)} (sudah terbayar/dicicil {formatRupiah(totalPaid)})
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Jatuh Tempo (opsional)</label>
                <input
                  className="form-input"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Catatan (opsional)</label>
                <input
                  className="form-input"
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Catatan piutang..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditForm(false)} style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isEditingSubmitting} style={{ flex: 1 }}>
                  {isEditingSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirmDelete && (
        <ConfirmDialog
          isOpen={showConfirmDelete}
          title="Hapus Catatan Piutang?"
          message={`Hapus piutang atas nama "${receivable.debtor_name}" sebesar ${formatRupiah(receivable.amount)}? Seluruh riwayat pelunasan terkait piutang ini juga akan dihapus dan saldo bank akan disesuaikan.`}
          confirmText="Ya, Hapus"
          onConfirm={handleDeleteReceivable}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    </PullToRefresh>
  );
}
