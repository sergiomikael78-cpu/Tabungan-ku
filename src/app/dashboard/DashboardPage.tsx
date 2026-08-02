'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/context/ProfileContext';
import { useAuth } from '@/context/AuthContext';
import BalanceCard from '@/components/BalanceCard';
import BankAccountCard from '@/components/BankAccountCard';
import ChartWidget from '@/components/ChartWidget';
import TransactionListItem from '@/components/TransactionListItem';
import type { BankWithBalance, Transaction, Receivable } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';
import { ChevronRight, Bell } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import PullToRefresh from '@/components/PullToRefresh';

export default function DashboardPage() {
  const { activeProfile, profileEmoji, getDisplayName } = useProfile();
  const { user } = useAuth();

  const [banks, setBanks] = useState<BankWithBalance[]>([]);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [activeReceivables, setActiveReceivables] = useState<Receivable[]>([]);
  const [chartData, setChartData] = useState<{ label: string; balance: number }[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [overdueCount, setOverdueCount] = useState(0);

  const fetchBanksAndBalances = async () => {
    const { data: bankData } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_archived', false)
      .order('bank_name');

    const banksWithBalance: BankWithBalance[] = [];

    if (bankData) {
      for (const bank of bankData) {
        const { data: deposits } = await supabase
          .from('transactions')
          .select('amount')
          .eq('bank_account_id', bank.id)
          .eq('type', 'SETOR');

        const { data: withdrawals } = await supabase
          .from('transactions')
          .select('amount')
          .eq('bank_account_id', bank.id)
          .eq('type', 'TARIK');

        const { data: receivables } = await supabase
          .from('receivables')
          .select('amount')
          .eq('bank_account_id', bank.id);

        const { data: payments } = await supabase
          .from('receivable_payments')
          .select('amount')
          .eq('bank_account_id', bank.id);

        const totalDeposits = (deposits || []).reduce((s, t) => s + t.amount, 0);
        const totalWithdrawals = (withdrawals || []).reduce((s, t) => s + t.amount, 0);
        const totalLent = (receivables || []).reduce((s, r) => s + r.amount, 0);
        const totalPayments = (payments || []).reduce((s, p) => s + p.amount, 0);

        banksWithBalance.push({
          ...bank,
          balance: totalDeposits - totalWithdrawals - totalLent + totalPayments,
        });
      }
    }
    setBanks(banksWithBalance);
  };

  const fetchRecentTransactions = async () => {
    const { data: txData } = await supabase
      .from('transactions')
      .select('*, bank_accounts(*)')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8);
    setRecentTx(txData || []);
  };

  const fetchActiveReceivables = async () => {
    const { data: recData } = await supabase
      .from('receivables')
      .select('*, bank_accounts(*)')
      .neq('status', 'LUNAS')
      .order('created_at', { ascending: false });

    if (recData) {
      const withRemaining = await Promise.all(
        recData.map(async (r) => {
          const { data: pays } = await supabase
            .from('receivable_payments')
            .select('amount')
            .eq('receivable_id', r.id);
          const total_paid = (pays || []).reduce((s, p) => s + p.amount, 0);
          return { ...r, total_paid, remaining: r.amount - total_paid };
        })
      );
      setActiveReceivables(withRemaining as (Receivable & { total_paid: number; remaining: number })[]);
    } else {
      setActiveReceivables([]);
    }

    const now = new Date().toISOString().split('T')[0];
    const overdue = (recData || []).filter(
      (r) => r.due_date && r.due_date < now && r.status !== 'LUNAS'
    );
    setOverdueCount(overdue.length);
  };

  const buildChartData = async () => {
    const months: { label: string; start: string; end: string }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      months.push({
        label: d.toLocaleDateString('id-ID', { month: 'short' }),
        start: '2000-01-01',
        end: nextMonth.toISOString().split('T')[0],
      });
    }

    const points: { label: string; balance: number }[] = [];

    for (const m of months) {
      const { data: deps } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'SETOR')
        .lt('transaction_date', m.end);
      const totalDeps = (deps || []).reduce((s, t) => s + t.amount, 0);

      const { data: wds } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'TARIK')
        .lt('transaction_date', m.end);
      const totalWds = (wds || []).reduce((s, t) => s + t.amount, 0);

      const { data: recs } = await supabase
        .from('receivables')
        .select('amount')
        .lt('lent_date', m.end);
      const totalRecs = (recs || []).reduce((s, r) => s + r.amount, 0);

      const { data: pays } = await supabase
        .from('receivable_payments')
        .select('amount')
        .lt('payment_date', m.end);
      const totalPays = (pays || []).reduce((s, p) => s + p.amount, 0);

      points.push({
        label: m.label,
        balance: totalDeps - totalWds - totalRecs + totalPays,
      });
    }

    setChartData(points);
  };

  const loadData = useCallback(async (isInitial = false) => {
    if (!user) return;

    if (isInitial) {
      setIsInitialLoading(true);
    }

    try {
      // Orchestrated parallel execution using Promise.allSettled
      await Promise.allSettled([
        fetchBanksAndBalances(),
        fetchRecentTransactions(),
        fetchActiveReceivables(),
        buildChartData(),
      ]);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      if (isInitial) {
        setIsInitialLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Listen for transaction updates (background sync, keep isInitialLoading = false)
  useEffect(() => {
    const handler = () => loadData(false);
    window.addEventListener('transaction-update', handler);
    return () => window.removeEventListener('transaction-update', handler);
  }, [loadData]);

  // Realtime subscriptions (background sync, keep isInitialLoading = false)
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => loadData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receivables' }, () => loadData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receivable_payments' }, () => loadData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, () => loadData(false))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const totalBalance = banks.reduce((s, b) => s + b.balance, 0);
  const totalPiutang = activeReceivables.reduce((s, r: Receivable & { remaining?: number }) => s + (r.remaining ?? r.amount), 0);

  // Monthly change calculation
  const currentMonthChart = chartData.find((_, i) => i === chartData.length - 1);
  const prevMonthChart = chartData.find((_, i) => i === chartData.length - 2);
  const monthlyChange =
    currentMonthChart && prevMonthChart
      ? currentMonthChart.balance - prevMonthChart.balance
      : undefined;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  // Full-page Single Skeleton during initial load
  if (isInitialLoading) {
    return (
      <div className="page-container" style={{ opacity: 0.85 }}>
        {/* Header Skeleton */}
        <div className="dash-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
            <div>
              <div className="skeleton" style={{ width: '80px', height: '12px', marginBottom: '6px' }} />
              <div className="skeleton" style={{ width: '120px', height: '18px' }} />
            </div>
          </div>
          <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
        </div>

        {/* Balance Card Skeleton */}
        <div className="dash-section">
          <div className="skeleton" style={{ height: '140px', borderRadius: 'var(--radius-xl)' }} />
        </div>

        {/* Chart Skeleton */}
        <div className="dash-section">
          <div className="skeleton" style={{ height: '220px', borderRadius: 'var(--radius-lg)' }} />
        </div>

        {/* Bank Section Skeleton */}
        <div style={{ paddingBottom: '16px' }}>
          <div className="dash-section-header" style={{ padding: '0 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <div className="skeleton" style={{ width: '100px', height: '16px' }} />
            <div className="skeleton" style={{ width: '60px', height: '14px' }} />
          </div>
          <div className="dash-bank-scroll" style={{ display: 'flex', gap: '12px', padding: '0 16px' }}>
            <div className="skeleton" style={{ minWidth: '170px', height: '90px', borderRadius: 'var(--radius-lg)' }} />
            <div className="skeleton" style={{ minWidth: '170px', height: '90px', borderRadius: 'var(--radius-lg)' }} />
          </div>
        </div>

        {/* Recent Transactions Skeleton */}
        <div style={{ paddingBottom: '16px' }}>
          <div className="dash-section-header" style={{ padding: '0 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <div className="skeleton" style={{ width: '120px', height: '16px' }} />
            <div className="skeleton" style={{ width: '60px', height: '14px' }} />
          </div>
          <div className="glass-card" style={{ margin: '0 16px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton" style={{ height: '48px', borderRadius: 'var(--radius-md)' }} />
            <div className="skeleton" style={{ height: '48px', borderRadius: 'var(--radius-md)' }} />
            <div className="skeleton" style={{ height: '48px', borderRadius: 'var(--radius-md)' }} />
          </div>
        </div>
      </div>
    );
  }

  // Single Reveal Container
  return (
    <PullToRefresh onRefresh={() => loadData(false)}>
      <div className="page-container dash-reveal">
      {/* Header */}
      <div className="dash-header">
        <div className="dash-greeting-wrap">
          <Image
            src="/saving-vision-logo.png"
            alt="Saving Vision Logo"
            width={40}
            height={40}
            style={{ borderRadius: '50%', border: '1px solid var(--border-light)', filter: 'drop-shadow(0 2px 8px rgba(16,185,129,0.3))' }}
          />
          <div>
            <p className="dash-greeting-label">{greeting()}</p>
            <p className="dash-greeting-name">{getDisplayName(activeProfile)} 👋</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontFamily: 'var(--font-brand), Georgia, serif',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            background: 'linear-gradient(135deg, #6ee7b7 0%, #10b981 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            SAVING VISION
          </span>
          <Link href="/receivables" className="dash-bell">
            <Bell size={22} />
            {overdueCount > 0 && (
              <span className="dash-bell-badge">
                {overdueCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Total Balance */}
      <div className="dash-section">
        <BalanceCard
          totalBalance={totalBalance}
          totalPiutang={totalPiutang}
          monthlyChange={monthlyChange}
        />
      </div>

      {/* Piutang Summary */}
      {activeReceivables.length > 0 && (
        <div className="dash-section">
          <Link href="/receivables" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="glass-card dash-piutang-card">
              <div className="dash-piutang-left">
                <span className="dash-piutang-icon">💰</span>
                <div>
                  <p className="dash-piutang-label">Piutang Aktif</p>
                  <p className="dash-piutang-amount">
                    {formatRupiah(totalPiutang)}
                  </p>
                </div>
              </div>
              <div className="dash-piutang-right">
                <span className="badge badge-warning">{activeReceivables.length} orang</span>
                <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Chart */}
      <div className="dash-section">
        <ChartWidget data={chartData} />
      </div>

      {/* Bank Breakdown */}
      <div style={{ paddingBottom: '16px' }}>
        <div className="dash-section-header" style={{ padding: '0 16px' }}>
          <p className="section-title" style={{ padding: 0, margin: 0 }}>Rekening Bank</p>
          <Link href="/banks" className="dash-section-link">
            Lihat semua
          </Link>
        </div>
        <div className="dash-bank-scroll">
          {banks.length > 0 ? (
            banks.map((bank) => <BankAccountCard key={bank.id} bank={bank} />)
          ) : (
            <Link href="/banks" style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}>
              <div className="glass-card empty-state" style={{ padding: '24px' }}>
                <span style={{ fontSize: '32px' }}>🏦</span>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  Belum ada rekening bank. Tambahkan rekening pertama.
                </p>
                <span className="btn btn-sm btn-primary">Tambah Bank</span>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={{ paddingBottom: '16px' }}>
        <div className="dash-section-header" style={{ padding: '0 16px' }}>
          <p className="section-title" style={{ padding: 0, margin: 0 }}>Transaksi Terbaru</p>
          <Link href="/history" className="dash-section-link">
            Lihat semua
          </Link>
        </div>
        <div className="glass-card" style={{ margin: '0 16px', overflow: 'hidden' }}>
          {recentTx.length > 0 ? (
            recentTx.map((tx) => <TransactionListItem key={tx.id} transaction={tx} />)
          ) : (
            <div className="empty-state">
              <span style={{ fontSize: '32px' }}>📝</span>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Belum ada transaksi. Mulai catat setoran pertama kalian!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </PullToRefresh>
  );
}
