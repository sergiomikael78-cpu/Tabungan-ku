'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatRupiah } from '@/lib/utils';

interface ChartDataPoint {
  label: string;
  balance: number;
}

interface ChartWidgetProps {
  data: ChartDataPoint[];
  title?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        <p className="chart-tooltip-value">{formatRupiah(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

export default function ChartWidget({ data, title = 'Tren Saldo' }: ChartWidgetProps) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card chart-card">
        <p className="chart-title">
          {title}
        </p>
        <div className="empty-state" style={{ padding: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Belum cukup data untuk menampilkan grafik
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card chart-card">
      <p className="chart-title">
        {title}
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--dynamic-accent, #10b981)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--dynamic-accent, #10b981)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="var(--border-default)" 
            vertical={false} 
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
              return v.toString();
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--dynamic-accent, #10b981)"
            strokeWidth={2.5}
            fill="url(#balanceGradient)"
            dot={false}
            activeDot={{ r: 5, fill: 'var(--dynamic-accent, #10b981)', strokeWidth: 2, stroke: 'var(--bg-card)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
