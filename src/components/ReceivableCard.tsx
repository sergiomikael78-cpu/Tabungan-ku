'use client';

import React from 'react';
import { formatRupiah, formatDate, getDaysUntilDue } from '@/lib/utils';
import type { Receivable } from '@/lib/types';
import Link from 'next/link';

interface ReceivableCardProps {
  receivable: Receivable;
  totalPaid: number;
}

export default function ReceivableCard({ receivable, totalPaid }: ReceivableCardProps) {
  const remaining = receivable.amount - totalPaid;
  const progressPct = receivable.amount > 0 ? (totalPaid / receivable.amount) * 100 : 0;
  const daysUntil = getDaysUntilDue(receivable.due_date);

  const statusConfig = {
    BELUM_LUNAS: { label: 'Belum Lunas', className: 'badge-danger' },
    SEBAGIAN: { label: 'Lunas Sebagian', className: 'badge-warning' },
    LUNAS: { label: 'Lunas', className: 'badge-success' },
  };

  const status = statusConfig[receivable.status];
  const isOverdue = daysUntil !== null && daysUntil < 0 && receivable.status !== 'LUNAS';

  return (
    <Link href={`/receivables/${receivable.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div 
        className="glass-card rec-card" 
        style={{ borderColor: isOverdue ? 'rgba(248, 113, 113, 0.3)' : undefined }}
      >
        <div className="rec-header">
          <div>
            <p className="rec-name">
              {receivable.debtor_name}
            </p>
            <p className="rec-meta">
              {formatDate(receivable.lent_date)}
              {receivable.bank_accounts && ` • ${receivable.bank_accounts.bank_name}`}
            </p>
          </div>
          <span className={`badge ${status.className}`}>{status.label}</span>
        </div>

        <div className="rec-amounts">
          <span className="rec-paid">
            Terbayar: {formatRupiah(totalPaid)}
          </span>
          <span className="rec-total">
            {formatRupiah(receivable.amount)}
          </span>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.min(progressPct, 100)}%` }} />
        </div>

        {receivable.status !== 'LUNAS' && (
          <div className="rec-footer">
            <span className="rec-remaining">
              Sisa: {formatRupiah(remaining)}
            </span>
            {daysUntil !== null && (
              <span style={{
                color: isOverdue ? 'var(--red-400)' : daysUntil <= 7 ? 'var(--yellow-400)' : 'var(--text-muted)',
                fontWeight: isOverdue ? 600 : 400,
              }}>
                {isOverdue
                  ? `⚠️ Lewat ${Math.abs(daysUntil)} hari`
                  : `${daysUntil} hari lagi`}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
