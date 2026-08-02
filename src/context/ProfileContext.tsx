'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type ProfileName = 'Kamu' | 'Pacar';

interface ProfileContextType {
  activeProfile: ProfileName | null;
  setActiveProfile: (profile: ProfileName) => void;
  clearProfile: () => void;
  profileEmoji: string;
  displayNames: Record<ProfileName, string>;
  getDisplayName: (key: string | null | undefined) => string;
  updateDisplayNames: (kamu: string, pacar: string) => Promise<boolean>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const PROFILE_STORAGE_KEY = 'tabungan-kita-active-profile';
const DISPLAY_NAMES_STORAGE_KEY = 'tabungan-kita-display-names';

const PROFILE_EMOJIS: Record<ProfileName, string> = {
  Kamu: '👦',
  Pacar: '👧',
};

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeProfile, setActiveProfileState] = useState<ProfileName | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [displayNames, setDisplayNamesState] = useState<Record<ProfileName, string>>({
    Kamu: 'Kamu',
    Pacar: 'Pacar',
  });

  const setDisplayNames = useCallback((namesOrFn: Record<ProfileName, string> | ((prev: Record<ProfileName, string>) => Record<ProfileName, string>)) => {
    setDisplayNamesState((prev) => {
      const next = typeof namesOrFn === 'function' ? namesOrFn(prev) : namesOrFn;
      try {
        localStorage.setItem(DISPLAY_NAMES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore localStorage write errors
      }
      return next;
    });
  }, []);

  // Initial load from localStorage (instant cache)
  useEffect(() => {
    const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY) as ProfileName | null;
    if (storedProfile && (storedProfile === 'Kamu' || storedProfile === 'Pacar')) {
      setActiveProfileState(storedProfile);
    }

    const storedNames = localStorage.getItem(DISPLAY_NAMES_STORAGE_KEY);
    if (storedNames) {
      try {
        const parsed = JSON.parse(storedNames);
        if (parsed && typeof parsed.Kamu === 'string' && typeof parsed.Pacar === 'string') {
          setDisplayNamesState(parsed);
        }
      } catch {
        // ignore JSON parse error
      }
    }

    setIsLoaded(true);
  }, []);

  // Fetch & Seed & Realtime Sync for profile_settings
  useEffect(() => {
    if (!user) return;

    let isSubscribed = true;

    const initProfileSettings = async () => {
      // 1. Idempotent seed default rows (ON CONFLICT ... DO NOTHING)
      await supabase.from('profile_settings').upsert(
        [
          { user_id: user.id, profile_key: 'Kamu', display_name: 'Kamu' },
          { user_id: user.id, profile_key: 'Pacar', display_name: 'Pacar' },
        ],
        { onConflict: 'user_id,profile_key', ignoreDuplicates: true }
      );

      // 2. Fetch current settings from database
      const { data } = await supabase
        .from('profile_settings')
        .select('*')
        .eq('user_id', user.id);

      if (data && data.length > 0 && isSubscribed) {
        setDisplayNames((prev) => {
          const updated = { ...prev };
          data.forEach((row: { profile_key: ProfileName; display_name: string }) => {
            if (row.profile_key === 'Kamu' || row.profile_key === 'Pacar') {
              updated[row.profile_key] = row.display_name;
            }
          });
          return updated;
        });
      }
    };

    initProfileSettings();

    // 3. Subscribe to Realtime changes
    const channel = supabase
      .channel(`profile_settings:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_settings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as { profile_key: ProfileName; display_name: string };
          if (newRow && newRow.profile_key && newRow.display_name && isSubscribed) {
            setDisplayNames((prev) => ({
              ...prev,
              [newRow.profile_key]: newRow.display_name,
            }));
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [user, setDisplayNames]);

  const setActiveProfile = (profile: ProfileName) => {
    setActiveProfileState(profile);
    localStorage.setItem(PROFILE_STORAGE_KEY, profile);
  };

  const clearProfile = () => {
    setActiveProfileState(null);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(DISPLAY_NAMES_STORAGE_KEY);
  };

  const getDisplayName = useCallback(
    (key: string | null | undefined): string => {
      if (!key) return '';
      if (key === 'Kamu' || key === 'Pacar') {
        return displayNames[key] || key;
      }
      return key;
    },
    [displayNames]
  );

  const updateDisplayNames = async (kamu: string, pacar: string): Promise<boolean> => {
    if (!user) {
      console.error('updateDisplayNames failed: User is not authenticated');
      return false;
    }

    try {
      const now = new Date().toISOString();

      const { error: err1 } = await supabase.from('profile_settings').upsert(
        {
          user_id: user.id,
          profile_key: 'Kamu',
          display_name: kamu.trim(),
          updated_at: now,
        },
        { onConflict: 'user_id,profile_key' }
      );

      if (err1) {
        console.error('Error upserting profile_settings for Kamu:', err1);
        return false;
      }

      const { error: err2 } = await supabase.from('profile_settings').upsert(
        {
          user_id: user.id,
          profile_key: 'Pacar',
          display_name: pacar.trim(),
          updated_at: now,
        },
        { onConflict: 'user_id,profile_key' }
      );

      if (err2) {
        console.error('Error upserting profile_settings for Pacar:', err2);
        return false;
      }

      setDisplayNames({
        Kamu: kamu.trim(),
        Pacar: pacar.trim(),
      });
      return true;
    } catch (err) {
      console.error('Unexpected error in updateDisplayNames:', err);
      return false;
    }
  };

  const profileEmoji = activeProfile ? PROFILE_EMOJIS[activeProfile] : '👤';

  if (!isLoaded) {
    return null;
  }

  return (
    <ProfileContext.Provider
      value={{
        activeProfile,
        setActiveProfile,
        clearProfile,
        profileEmoji,
        displayNames,
        getDisplayName,
        updateDisplayNames,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
