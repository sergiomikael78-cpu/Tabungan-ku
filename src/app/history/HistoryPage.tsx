'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Transaction, BankAccount } from '@/lib/types';
import TransactionListItem, { TransactionSkeleton } from '@/components/TransactionListItem';
import AddTransactionModal from '@/components/AddTransactionModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { useProfile } from '@/context/ProfileContext';
import PullToRefresh from '@/components/PullToRefresh';

export default function HistoryPage() {
  const { getDisplayName } = useProfile();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  // Filters
  const [search, setSearch] = useState('');
  const [filterBank, setFilterBank] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterProfile, setFilterProfile] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const loadBanks = useCallback(async () => {
    const { data } = await supabase.from('bank_accounts').select('*').eq('is_archived', false).order('bank_name');
    setBanks(data || []);
  }, []);

  const loadTransactions = useCallback(async (reset = true) => {
    setIsLoading(true);
    let query = supabase
      .from('transactions')
      .select('*, bank_accounts(*)')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filterBank) query = query.eq('bank_account_id', filterBank);
    if (filterType) query = query.eq('type', filterType);
    if (filterProfile) query = query.eq('profile_name', filterProfile);
    if (filterDateFrom) query = query.gte('transaction_date', filterDateFrom);
    if (filterDateTo) query = query.lte('transaction_date', filterDateTo);
    if (search) query = query.ilike('note', `%${search}%`);

    const offset = reset ? 0 : transactions.length;
    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data } = await query;

    if (data) {
      if (reset) {
        setTransactions(data);
      } else {
        setTransactions((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === PAGE_SIZE);
    }
    setIsLoading(false);
  }, [filterBank, filterType, filterProfile, filterDateFrom, filterDateTo, search, transactions.length]);

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<Transaction | null>(null);

  const handleDelete = async () => {
    if (!confirmDeleteTx) return;
    const { error } = await supabase.from('transactions').delete().eq('id', confirmDeleteTx.id);
    if (!error) {
      loadTransactions(true);
      window.dispatchEvent(new CustomEvent('transaction-update'));
    }
    setConfirmDeleteTx(null);
  };

  useEffect(() => { loadBanks(); }, [loadBanks]);
  useEffect(() => { loadTransactions(true); }, [filterBank, filterType, filterProfile, filterDateFrom, filterDateTo, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    await Promise.all([loadTransactions(true), loadBanks()]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="page-container">
      <div className="page-header">
        <Link href="/" style={{ color: 'var(--text-muted)', display: 'flex' }}>
          <ArrowLeft size={22} />
        </Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Riwayat Transaksi</h1>
      </div>

      {/* Search */}
      <div className="search-container">
        <Search size={16} className="search-icon" />
        <input
          className="form-input search-input"
          type="text"
          placeholder="Cari catatan transaksi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter Chips */}
      <div className="filter-scroll">
        <select
          className={`chip ${filterBank ? 'active' : ''}`}
          value={filterBank}
          onChange={(e) => setFilterBank(e.target.value)}
        >
          <option value="">Semua Bank</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>{b.bank_name}</option>
          ))}
        </select>

        <select
          className={`chip ${filterType ? 'active' : ''}`}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Semua Tipe</option>
          <option value="SETOR">Setoran</option>
          <option value="TARIK">Penarikan</option>
        </select>

        <select
          className={`chip ${filterProfile ? 'active' : ''}`}
          value={filterProfile}
          onChange={(e) => setFilterProfile(e.target.value)}
        >
          <option value="">Semua Profil</option>
          <option value="Kamu">👦 {getDisplayName('Kamu')}</option>
          <option value="Pacar">👧 {getDisplayName('Pacar')}</option>
        </select>

        <input
          className={`chip ${filterDateFrom ? 'active' : ''}`}
          type="date"
          placeholder="Dari"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
        />
        <input
          className={`chip ${filterDateTo ? 'active' : ''}`}
          type="date"
          placeholder="Sampai"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
        />
      </div>

      {/* Transaction List */}
      <div className="history-list-wrap">
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {isLoading && transactions.length === 0 ? (
            Array.from({ length: 8 }).map((_, i) => <TransactionSkeleton key={i} />)
          ) : transactions.length > 0 ? (
            <>
              {transactions.map((tx) => (
                <TransactionListItem
                  key={tx.id}
                  transaction={tx}
                  onEdit={(t) => setEditingTx(t)}
                  onDelete={(t) => setConfirmDeleteTx(t)}
                />
              ))}
              {hasMore && (
                <div className="load-more-wrap">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => loadTransactions(false)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Memuat...' : 'Muat lebih banyak'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon">🔍</span>
              <p className="empty-state-title">Tidak ditemukan</p>
              <p className="empty-state-text">
                Tidak ditemukan transaksi yang cocok. Coba ubah filter atau kata kunci.
              </p>
            </div>
          )}
        </div>
      </div>

      {editingTx && (
        <AddTransactionModal
          isOpen={!!editingTx}
          onClose={() => setEditingTx(null)}
          onSuccess={() => {
            loadTransactions(true);
            window.dispatchEvent(new CustomEvent('transaction-update'));
          }}
          editingTransaction={editingTx}
        />
      )}

      {confirmDeleteTx && (
        <ConfirmDialog
          isOpen={!!confirmDeleteTx}
          title="Hapus Transaksi?"
          message={`Hapus transaksi ${confirmDeleteTx.type === 'SETOR' ? 'Setoran' : 'Penarikan'} sebesar Rp${new Intl.NumberFormat('id-ID').format(confirmDeleteTx.amount)}? Saldo rekening akan ter-update.`}
          confirmText="Ya, Hapus"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteTx(null)}
        />
      )}
    </div>
    </PullToRefresh>
  );
}
