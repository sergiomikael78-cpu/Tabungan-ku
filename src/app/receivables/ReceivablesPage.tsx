'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import ReceivableCard from '@/components/ReceivableCard';
import type { Receivable, ReceivablePayment } from '@/lib/types';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import PullToRefresh from '@/components/PullToRefresh';

type FilterStatus = 'ALL' | 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS';

export default function ReceivablesPage() {
  const [receivables, setReceivables] = useState<(Receivable & { total_paid: number })[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    let query = supabase
      .from('receivables')
      .select('*, bank_accounts(*)')
      .order('created_at', { ascending: false });

    if (filter !== 'ALL') {
      query = query.eq('status', filter);
    }

    const { data: recData } = await query;

    if (recData) {
      // Fetch payments for each
      const withPayments = await Promise.all(
        recData.map(async (r) => {
          const { data: payments } = await supabase
            .from('receivable_payments')
            .select('amount')
            .eq('receivable_id', r.id);
          const total_paid = (payments || []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
          return { ...r, total_paid };
        })
      );

      const filtered = search
        ? withPayments.filter((r) =>
            r.debtor_name.toLowerCase().includes(search.toLowerCase())
          )
        : withPayments;

      setReceivables(filtered);
    }
    setIsLoading(false);
  }, [filter, search]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handler = () => loadData();
    window.addEventListener('transaction-update', handler);
    return () => window.removeEventListener('transaction-update', handler);
  }, [loadData]);

  const filters: { value: FilterStatus; label: string }[] = [
    { value: 'ALL', label: 'Semua' },
    { value: 'BELUM_LUNAS', label: 'Belum Lunas' },
    { value: 'SEBAGIAN', label: 'Sebagian' },
    { value: 'LUNAS', label: 'Lunas' },
  ];

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="page-container">
      <div className="page-header">
        <Link href="/" style={{ color: 'var(--text-muted)', display: 'flex' }}>
          <ArrowLeft size={22} />
        </Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Daftar Piutang</h1>
      </div>

      {/* Search */}
      <div className="search-container">
        <Search size={16} className="search-icon" />
        <input
          className="form-input search-input"
          type="text"
          placeholder="Cari nama peminjam..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter Chips */}
      <div className="filter-scroll">
        {filters.map((f) => (
          <button
            key={f.value}
            className={`chip ${filter === f.value ? 'active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
          ))
        ) : receivables.length > 0 ? (
          receivables.map((r) => (
            <ReceivableCard key={r.id} receivable={r} totalPaid={r.total_paid} />
          ))
        ) : (
          <div className="empty-state" style={{ marginTop: '40px' }}>
            <span className="empty-state-icon">👍</span>
            <p className="empty-state-title">
              {filter === 'ALL' ? 'Belum ada catatan piutang' : 'Tidak ada piutang dengan status ini'}
            </p>
            <p className="empty-state-text">
              {filter === 'ALL'
                ? 'Semua uang aman di rekening!'
                : 'Coba ubah filter untuk melihat piutang lainnya.'}
            </p>
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}
