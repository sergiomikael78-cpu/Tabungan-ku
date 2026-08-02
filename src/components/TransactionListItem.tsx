'use client';

import React from 'react';
import { formatRupiah, formatDate } from '@/lib/utils';
import type { Transaction } from '@/lib/types';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useProfile } from '@/context/ProfileContext';

interface TransactionListItemProps {
  transaction: Transaction;
  showBank?: boolean;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
}

export default function TransactionListItem({ transaction, showBank = true, onEdit, onDelete }: TransactionListItemProps) {
  const { getDisplayName } = useProfile();
  const isSetor = transaction.type === 'SETOR';
  const profileEmoji = transaction.profile_name === 'Kamu' ? '👦' : '👧';
  const displayName = getDisplayName(transaction.profile_name);

  return (
    <div className="transaction-item">
      <div className={`tx-icon ${isSetor ? 'setor' : 'tarik'}`}>
        {isSetor ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <p className="tx-title">
            {isSetor ? 'Setoran' : 'Penarikan'}
          </p>
          <span className="profile-avatar" title={displayName}>
            {profileEmoji}
          </span>
        </div>
        <div className="tx-meta">
          {showBank && transaction.bank_accounts && (
            <span className="tx-meta-bank">
              {transaction.bank_accounts.bank_name}
            </span>
          )}
          <span className="tx-meta-date">
            {formatDate(transaction.transaction_date)}
          </span>
        </div>
        {transaction.note && (
          <p className="tx-note">
            {transaction.note}
          </p>
        )}
      </div>

      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        <p className={`tx-amount ${isSetor ? 'positive' : 'negative'}`}>
          {isSetor ? '+' : '-'}{formatRupiah(transaction.amount)}
        </p>
        {(onEdit || onDelete) && (
          <div className="tx-actions">
            {onEdit && (
              <button
                onClick={() => onEdit(transaction)}
                className="tx-action-btn edit"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(transaction)}
                className="tx-action-btn delete"
              >
                Hapus
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="transaction-item">
      <div className="skeleton" style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '120px', height: '14px', marginBottom: '6px' }} />
        <div className="skeleton" style={{ width: '80px', height: '12px' }} />
      </div>
      <div className="skeleton" style={{ width: '80px', height: '16px' }} />
    </div>
  );
}
