'use client';

import React from 'react';
import { formatRupiah } from '@/lib/utils';
import type { BankWithBalance } from '@/lib/types';
import Link from 'next/link';

interface BankAccountCardProps {
  bank: BankWithBalance;
}

const BANK_COLORS: Record<string, string> = {
  '#10b981': 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)',
  '#3b82f6': 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
  '#f59e0b': 'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
  '#8b5cf6': 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%)',
  '#ef4444': 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
  '#ec4899': 'linear-gradient(135deg, #831843 0%, #9d174d 100%)',
  '#06b6d4': 'linear-gradient(135deg, #164e63 0%, #155e75 100%)',
  '#84cc16': 'linear-gradient(135deg, #365314 0%, #3f6212 100%)',
};

export default function BankAccountCard({ bank }: BankAccountCardProps) {
  const gradient = BANK_COLORS[bank.color_tag] || BANK_COLORS['#10b981'];
  
  return (
    <Link href={`/banks/${bank.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="bank-card" style={{ background: gradient }}>
        <div className="bank-card-header">
          <span className="bank-card-emoji">{bank.icon_emoji || '🏦'}</span>
          <div>
            <p className="bank-card-name">
              {bank.bank_name}
            </p>
            {bank.nickname && (
              <p className="bank-card-nickname">
                {bank.nickname}
              </p>
            )}
          </div>
        </div>
        <p className="bank-card-balance">
          {formatRupiah(bank.balance)}
        </p>
      </div>
    </Link>
  );
}

export function BankCardSkeleton() {
  return (
    <div className="bank-card skeleton" style={{ 
      minWidth: '170px', 
      height: '108px', 
      background: 'var(--bg-card)' 
    }} />
  );
}
