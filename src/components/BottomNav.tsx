'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Landmark, Plus, User } from 'lucide-react';

interface BottomNavProps {
  onAddClick: () => void;
}

export default function BottomNav({ onAddClick }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      <div className="nav-inner">
        {/* 1. Beranda */}
        <Link
          href="/"
          className={`nav-item ${pathname === '/' ? 'active' : ''}`}
        >
          <Home size={22} />
          <span>Beranda</span>
          {pathname === '/' && <span className="nav-active-dot" />}
        </Link>

        {/* 2. Tambah (+) */}
        <button className="nav-add-btn" onClick={onAddClick} aria-label="Tambah transaksi">
          <Plus size={24} strokeWidth={2.5} />
        </button>

        {/* 3. Rekening */}
        <Link
          href="/banks"
          className={`nav-item ${pathname.startsWith('/banks') ? 'active' : ''}`}
        >
          <Landmark size={22} />
          <span>Rekening</span>
          {pathname.startsWith('/banks') && <span className="nav-active-dot" />}
        </Link>

        {/* 4. Profil */}
        <Link
          href="/profile"
          className={`nav-item ${pathname === '/profile' ? 'active' : ''}`}
        >
          <User size={22} />
          <span>Profil</span>
          {pathname === '/profile' && <span className="nav-active-dot" />}
        </Link>
      </div>
    </nav>
  );
}
