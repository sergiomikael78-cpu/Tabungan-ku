'use client';

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
}

export default function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const isPulling = useRef(false);

  const PULL_THRESHOLD = 70;
  const MAX_PULL = 110;

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Disable pull-to-refresh if modal or backdrop is active
      if (document.body.classList.contains('modal-open') || document.querySelector('.modal-backdrop') || document.querySelector('.modal-overlay') || document.querySelector('.confirm-dialog')) {
        return;
      }

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY;
        touchStartX.current = e.touches[0].clientX;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 0) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;
      const deltaY = touchY - touchStartY.current;
      const deltaX = touchX - touchStartX.current;

      // Ignore horizontal scrolls (e.g. bank cards horizontal scroll container)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      if (deltaY > 0) {
        // Rubber-band dampening calculation
        const distance = Math.min(deltaY * 0.45, MAX_PULL);
        setPullDistance(distance);

        // Prevent browser native overscroll reload if pulling down
        if (e.cancelable && distance > 10) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(PULL_THRESHOLD);

        try {
          await onRefresh();
        } catch (err) {
          console.error('PullToRefresh failed:', err);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, isRefreshing, onRefresh, pullDistance]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Pull Indicator Spinner Widget */}
      <div
        className="ptr-indicator-wrap"
        style={{
          transform: `translate3d(0, ${pullDistance}px, 0)`,
          opacity: pullDistance > 5 ? 1 : 0,
        }}
      >
        <div className="ptr-indicator-circle">
          {isRefreshing ? (
            <Loader2 className="ptr-spin" size={20} />
          ) : (
            <ArrowDown
              size={18}
              style={{
                transform: `rotate(${progress * 180}deg)`,
                transition: 'transform 0.1s linear',
              }}
            />
          )}
        </div>
      </div>

      {/* Wrapped Content Container */}
      <div
        style={{
          transform: `translate3d(0, ${pullDistance * 0.4}px, 0)`,
          transition: isPulling.current ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}
