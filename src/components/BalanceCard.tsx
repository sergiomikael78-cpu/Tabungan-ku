'use client';

import React from 'react';
import { formatRupiah } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface BalanceCardProps {
  totalBalance: number;
  totalPiutang: number;
  monthlyChange?: number;
}

export default function BalanceCard({ totalBalance, totalPiutang, monthlyChange }: BalanceCardProps) {
  const isPositiveChange = (monthlyChange ?? 0) >= 0;

  return (
    <div className="balance-card">
      <div className="balance-inner">
        <p className="balance-label">
          Total Saldo Gabungan
        </p>
        <p className="balance-amount">
          {formatRupiah(totalBalance)}
        </p>

        <div className="balance-pills">
          {monthlyChange !== undefined && (
            <div className="balance-pill">
              {isPositiveChange ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{isPositiveChange ? '+' : ''}{formatRupiah(monthlyChange)}</span>
              <span className="muted">bulan ini</span>
            </div>
          )}

          {totalPiutang > 0 && (
            <div className="balance-pill balance-pill--subtle">
              💰 Piutang aktif: {formatRupiah(totalPiutang)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
