'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatRupiah } from '@/lib/utils';
import type { BankAccount, Transaction } from '@/lib/types';
import TransactionListItem, { TransactionSkeleton } from '@/components/TransactionListItem';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PullToRefresh from '@/components/PullToRefresh';

export default function BankDetailPage() {
  const params = useParams();
  const bankId = params?.id as string;

  const [bank, setBank] = useState<BankAccount | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!bankId) return;

    const { data: bankData } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', bankId)
      .single();

    if (bankData) setBank(bankData);

    // Balance
    const { data: deps } = await supabase.from('transactions').select('amount').eq('bank_account_id', bankId).eq('type', 'SETOR');
    const { data: wds } = await supabase.from('transactions').select('amount').eq('bank_account_id', bankId).eq('type', 'TARIK');
    const { data: recs } = await supabase.from('receivables').select('amount').eq('bank_account_id', bankId);
    const { data: pays } = await supabase.from('receivable_payments').select('amount').eq('bank_account_id', bankId);

    const bal =
      (deps || []).reduce((s, t) => s + t.amount, 0) -
      (wds || []).reduce((s, t) => s + t.amount, 0) -
      (recs || []).reduce((s, r) => s + r.amount, 0) +
      (pays || []).reduce((s, p) => s + p.amount, 0);
    setBalance(bal);

    // Transactions
    const { data: txData } = await supabase
      .from('transactions')
      .select('*, bank_accounts(*)')
      .eq('bank_account_id', bankId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });
    setTransactions(txData || []);
    setIsLoading(false);
  }, [bankId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handler = () => loadData();
    window.addEventListener('transaction-update', handler);
    return () => window.removeEventListener('transaction-update', handler);
  }, [loadData]);

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="page-container">
      <div className="detail-header">
        <Link href="/banks" className="detail-back-btn" style={{ textDecoration: 'none' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="detail-title">
          {bank ? `${bank.icon_emoji || '🏦'} ${bank.bank_name}` : 'Memuat...'}
        </h1>
      </div>

      {/* Balance Header */}
      <div className="bank-detail-hero">
        <p className="bank-detail-label">Saldo Tercatat</p>
        <p 
          className="bank-detail-balance" 
          style={{ color: balance >= 0 ? 'var(--accent-emerald)' : 'var(--red-400)' }}
        >
          {formatRupiah(balance)}
        </p>
        {bank?.nickname && (
          <p className="bank-detail-nickname">{bank.nickname}</p>
        )}
      </div>

      {/* Transaction List */}
      <div className="detail-section">
        <p className="section-title" style={{ padding: 0, marginBottom: '10px' }}>
          Riwayat Transaksi
        </p>
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <TransactionSkeleton key={i} />)
          ) : transactions.length > 0 ? (
            transactions.map((tx) => (
              <TransactionListItem key={tx.id} transaction={tx} showBank={false} />
            ))
          ) : (
            <div className="empty-state">
              <span style={{ fontSize: '32px' }}>📝</span>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Belum ada transaksi di rekening ini.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </PullToRefresh>
  );
}
