'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { ProfileAppearance } from '@/lib/types';
import { extractColorsFromImageUrl } from '@/lib/colorExtractor';

type ProfileName = 'Kamu' | 'Pacar';

interface ProfileContextType {
  activeProfile: ProfileName | null;
  setActiveProfile: (profile: ProfileName) => void;
  clearProfile: () => void;
  profileEmoji: string;
  displayNames: Record<ProfileName, string>;
  getDisplayName: (key: string | null | undefined) => string;
  updateDisplayNames: (kamu: string, pacar: string) => Promise<boolean>;
  appearances: Record<ProfileName, ProfileAppearance>;
  currentAppearance: ProfileAppearance;
  updateAppearancePreset: (presetUrl: string) => Promise<boolean>;
  uploadCustomBackground: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
  uploadCustomAvatar: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
  removeCustomAvatar: () => Promise<boolean>;
  updateAppearanceEffects: (overlayOpacity: number, blurAmount: number) => Promise<boolean>;
  setLocalAppearanceEffects: (overlayOpacity: number, blurAmount: number) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const PROFILE_STORAGE_KEY = 'tabungan-kita-active-profile';
const DISPLAY_NAMES_STORAGE_KEY = 'tabungan-kita-display-names';
const APPEARANCE_STORAGE_KEY = 'tabungan-kita-appearances';

const PROFILE_EMOJIS: Record<ProfileName, string> = {
  Kamu: '👦',
  Pacar: '👧',
};

const DEFAULT_APPEARANCE: Record<ProfileName, ProfileAppearance> = {
  Kamu: {
    user_id: '',
    profile_key: 'Kamu',
    bg_type: 'preset',
    bg_value: '/backgrounds/preset-01.webp',
    avatar_url: null,
    overlay_opacity: 0.40,
    blur_amount: 12,
  },
  Pacar: {
    user_id: '',
    profile_key: 'Pacar',
    bg_type: 'preset',
    bg_value: '/backgrounds/preset-02.webp',
    avatar_url: null,
    overlay_opacity: 0.40,
    blur_amount: 12,
  },
};

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeProfile, setActiveProfileState] = useState<ProfileName | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [displayNames, setDisplayNamesState] = useState<Record<ProfileName, string>>({
    Kamu: 'Kamu',
    Pacar: 'Pacar',
  });
  const [appearances, setAppearancesState] = useState<Record<ProfileName, ProfileAppearance>>(DEFAULT_APPEARANCE);

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

  const setAppearances = useCallback((appOrFn: Record<ProfileName, ProfileAppearance> | ((prev: Record<ProfileName, ProfileAppearance>) => Record<ProfileName, ProfileAppearance>)) => {
    setAppearancesState((prev) => {
      const next = typeof appOrFn === 'function' ? appOrFn(prev) : appOrFn;
      try {
        localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next));
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

    const storedAppearances = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (storedAppearances) {
      try {
        const parsed = JSON.parse(storedAppearances);
        if (parsed && parsed.Kamu && parsed.Pacar) {
          setAppearancesState(parsed);
        }
      } catch {
        // ignore JSON parse error
      }
    }

    setIsLoaded(true);
  }, []);

  // Fetch & Seed & Realtime Sync for profile_settings and profile_appearance
  useEffect(() => {
    if (!user) return;

    let isSubscribed = true;

    const initProfileData = async () => {
      // 1. Idempotent seed default rows for profile_settings
      await supabase.from('profile_settings').upsert(
        [
          { user_id: user.id, profile_key: 'Kamu', display_name: 'Kamu' },
          { user_id: user.id, profile_key: 'Pacar', display_name: 'Pacar' },
        ],
        { onConflict: 'user_id,profile_key', ignoreDuplicates: true }
      );

      // 2. Idempotent seed default rows for profile_appearance
      try {
        await supabase.from('profile_appearance').upsert(
          [
            { user_id: user.id, profile_key: 'Kamu', bg_type: 'preset', bg_value: '/backgrounds/preset-01.webp', overlay_opacity: 0.40, blur_amount: 12 },
            { user_id: user.id, profile_key: 'Pacar', bg_type: 'preset', bg_value: '/backgrounds/preset-02.webp', overlay_opacity: 0.40, blur_amount: 12 },
          ],
          { onConflict: 'user_id,profile_key', ignoreDuplicates: true }
        );
      } catch {
        // Ignore table missing before migration
      }

      // 3. Fetch current settings from database
      const { data: settingsData } = await supabase
        .from('profile_settings')
        .select('*')
        .eq('user_id', user.id);

      if (settingsData && settingsData.length > 0 && isSubscribed) {
        setDisplayNames((prev) => {
          const updated = { ...prev };
          settingsData.forEach((row: { profile_key: ProfileName; display_name: string }) => {
            if (row.profile_key === 'Kamu' || row.profile_key === 'Pacar') {
              updated[row.profile_key] = row.display_name;
            }
          });
          return updated;
        });
      }

      // 4. Fetch current appearance from database
      try {
        const { data: appearanceData } = await supabase
          .from('profile_appearance')
          .select('*')
          .eq('user_id', user.id);

        if (appearanceData && appearanceData.length > 0 && isSubscribed) {
          setAppearances((prev) => {
            const updated = { ...prev };
            appearanceData.forEach((row: ProfileAppearance) => {
              if (row.profile_key === 'Kamu' || row.profile_key === 'Pacar') {
                updated[row.profile_key] = {
                  user_id: user.id,
                  profile_key: row.profile_key,
                  bg_type: row.bg_type || 'preset',
                  bg_value: row.bg_value || '/backgrounds/preset-01.webp',
                  accent_color: row.accent_color || null,
                  accent_color_secondary: row.accent_color_secondary || null,
                  avatar_url: row.avatar_url || null,
                  overlay_opacity: row.overlay_opacity ?? 0.40,
                  blur_amount: row.blur_amount ?? 12,
                };
              }
            });
            return updated;
          });
        }
      } catch {
        // Ignore table missing before migration
      }
    };

    initProfileData();

    // Subscribe to Realtime changes for profile_settings
    const settingsChannel = supabase
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

    // Subscribe to Realtime changes for profile_appearance
    const appearanceChannel = supabase
      .channel(`profile_appearance:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_appearance',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as ProfileAppearance;
          if (newRow && newRow.profile_key && isSubscribed) {
            setAppearances((prev) => ({
              ...prev,
              [newRow.profile_key]: {
                user_id: user.id,
                profile_key: newRow.profile_key,
                bg_type: newRow.bg_type || 'preset',
                bg_value: newRow.bg_value || '/backgrounds/preset-01.webp',
                accent_color: newRow.accent_color || null,
                accent_color_secondary: newRow.accent_color_secondary || null,
                avatar_url: newRow.avatar_url || null,
                overlay_opacity: newRow.overlay_opacity ?? 0.40,
                blur_amount: newRow.blur_amount ?? 12,
              },
            }));
          }
        }
      )
      .subscribe();

    // Cross-tab Synchronization Listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PROFILE_STORAGE_KEY && e.newValue) {
        if (e.newValue === 'Kamu' || e.newValue === 'Pacar') {
          setActiveProfileState(e.newValue);
        }
      }
      if (e.key === APPEARANCE_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.Kamu && parsed.Pacar) {
            setAppearancesState(parsed);
          }
        } catch {
          // ignore parse error
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Cleanup subscriptions & event listeners on unmount
    return () => {
      isSubscribed = false;
      window.removeEventListener('storage', handleStorageChange);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(appearanceChannel);
    };
  }, [user, setDisplayNames, setAppearances]);

  const setActiveProfile = (profile: ProfileName) => {
    setActiveProfileState(profile);
    localStorage.setItem(PROFILE_STORAGE_KEY, profile);
  };

  const clearProfile = () => {
    setActiveProfileState(null);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(DISPLAY_NAMES_STORAGE_KEY);
    localStorage.removeItem(APPEARANCE_STORAGE_KEY);
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

  const updateAppearancePreset = async (presetUrl: string): Promise<boolean> => {
    if (!user || !activeProfile) {
      console.error('updateAppearancePreset failed: User or active profile missing');
      return false;
    }

    try {
      const now = new Date().toISOString();
      const current = appearances[activeProfile] || DEFAULT_APPEARANCE[activeProfile];

      // Extract safe adaptive accent colors
      const extracted = await extractColorsFromImageUrl(presetUrl);

      const payload = {
        user_id: user.id,
        profile_key: activeProfile,
        bg_type: 'preset' as const,
        bg_value: presetUrl,
        accent_color: extracted.accentColor,
        accent_color_secondary: extracted.accentColorSecondary,
        avatar_url: current.avatar_url || null,
        overlay_opacity: current.overlay_opacity ?? 0.40,
        blur_amount: current.blur_amount ?? 12,
        updated_at: now,
      };

      const { error } = await supabase.from('profile_appearance').upsert(
        payload,
        { onConflict: 'user_id,profile_key' }
      );

      if (error) {
        console.error(`Error updating appearance for ${activeProfile}:`, error);
        return false;
      }

      setAppearances((prev) => ({
        ...prev,
        [activeProfile]: payload,
      }));
      return true;
    } catch (err) {
      console.error('Unexpected error in updateAppearancePreset:', err);
      return false;
    }
  };

  const uploadCustomBackground = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
    if (!user || !activeProfile) {
      return { success: false, error: 'User atau profil belum terpilih' };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Ukuran foto background maksimal 5MB' };
    }
    try {
      // Attempt auto-create bucket if missing
      try {
        await supabase.storage.createBucket('profile-assets', { public: true });
      } catch {
        // ignore if already exists or unauthorized
      }

      const ext = file.name.split('.').pop() || 'webp';
      const filePath = `${user.id}/${activeProfile}/background_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('profile-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadErr) {
        console.error('Storage upload error:', uploadErr);
        if (uploadErr.message?.includes('Bucket not found')) {
          return {
            success: false,
            error: 'Bucket "profile-assets" belum dibuat di Supabase Storage. Silakan buat Bucket bernama "profile-assets" (setting Public) di Supabase Storage Dashboard.',
          };
        }
        return { success: false, error: uploadErr.message };
      }

      const { data: publicUrlData } = supabase.storage
        .from('profile-assets')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      const now = new Date().toISOString();
      const current = appearances[activeProfile] || DEFAULT_APPEARANCE[activeProfile];

      // Extract safe adaptive accent colors
      const extracted = await extractColorsFromImageUrl(publicUrl);

      const payload = {
        user_id: user.id,
        profile_key: activeProfile,
        bg_type: 'custom' as const,
        bg_value: publicUrl,
        accent_color: extracted.accentColor,
        accent_color_secondary: extracted.accentColorSecondary,
        avatar_url: current.avatar_url || null,
        overlay_opacity: current.overlay_opacity ?? 0.40,
        blur_amount: current.blur_amount ?? 12,
        updated_at: now,
      };

      const { error: dbErr } = await supabase.from('profile_appearance').upsert(
        payload,
        { onConflict: 'user_id,profile_key' }
      );

      if (dbErr) {
        return { success: false, error: dbErr.message };
      }

      setAppearances((prev) => ({ ...prev, [activeProfile]: payload }));
      return { success: true, url: publicUrl };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mengupload background' };
    }
  };

  const uploadCustomAvatar = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
    if (!user || !activeProfile) {
      return { success: false, error: 'User atau profil belum terpilih' };
    }
    if (file.size > 3 * 1024 * 1024) {
      return { success: false, error: 'Ukuran foto avatar maksimal 3MB' };
    }
    try {
      // Attempt auto-create bucket if missing
      try {
        await supabase.storage.createBucket('profile-assets', { public: true });
      } catch {
        // ignore if already exists or unauthorized
      }

      const ext = file.name.split('.').pop() || 'webp';
      const filePath = `${user.id}/${activeProfile}/avatar_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('profile-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadErr) {
        console.error('Storage upload error:', uploadErr);
        if (uploadErr.message?.includes('Bucket not found')) {
          return {
            success: false,
            error: 'Bucket "profile-assets" belum dibuat di Supabase Storage. Silakan buat Bucket bernama "profile-assets" (setting Public) di Supabase Storage Dashboard.',
          };
        }
        return { success: false, error: uploadErr.message };
      }

      const { data: publicUrlData } = supabase.storage
        .from('profile-assets')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      const now = new Date().toISOString();
      const current = appearances[activeProfile] || DEFAULT_APPEARANCE[activeProfile];

      const payload = {
        ...current,
        user_id: user.id,
        profile_key: activeProfile,
        avatar_url: publicUrl,
        updated_at: now,
      };

      const { error: dbErr } = await supabase.from('profile_appearance').upsert(
        payload,
        { onConflict: 'user_id,profile_key' }
      );

      if (dbErr) {
        return { success: false, error: dbErr.message };
      }

      setAppearances((prev) => ({ ...prev, [activeProfile]: payload }));
      return { success: true, url: publicUrl };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mengupload avatar' };
    }
  };

  const removeCustomAvatar = async (): Promise<boolean> => {
    if (!user || !activeProfile) return false;
    try {
      const now = new Date().toISOString();
      const current = appearances[activeProfile] || DEFAULT_APPEARANCE[activeProfile];

      const payload = {
        ...current,
        user_id: user.id,
        profile_key: activeProfile,
        avatar_url: null,
        updated_at: now,
      };

      const { error } = await supabase.from('profile_appearance').upsert(
        payload,
        { onConflict: 'user_id,profile_key' }
      );

      if (error) return false;

      setAppearances((prev) => ({ ...prev, [activeProfile]: payload }));
      return true;
    } catch {
      return false;
    }
  };

  const setLocalAppearanceEffects = useCallback((overlayOpacity: number, blurAmount: number) => {
    if (!activeProfile) return;
    setAppearances((prev) => {
      const current = prev[activeProfile] || DEFAULT_APPEARANCE[activeProfile];
      return {
        ...prev,
        [activeProfile]: {
          ...current,
          overlay_opacity: overlayOpacity,
          blur_amount: blurAmount,
        },
      };
    });
  }, [activeProfile, setAppearances]);

  const updateAppearanceEffects = async (overlayOpacity: number, blurAmount: number): Promise<boolean> => {
    if (!user || !activeProfile) return false;
    try {
      const now = new Date().toISOString();
      const current = appearances[activeProfile] || DEFAULT_APPEARANCE[activeProfile];

      const payload = {
        ...current,
        user_id: user.id,
        profile_key: activeProfile,
        overlay_opacity: overlayOpacity,
        blur_amount: blurAmount,
        updated_at: now,
      };

      const { error } = await supabase.from('profile_appearance').upsert(
        payload,
        { onConflict: 'user_id,profile_key' }
      );

      if (error) {
        console.error('Error updating appearance effects:', error);
        return false;
      }

      setAppearances((prev) => ({ ...prev, [activeProfile]: payload }));
      return true;
    } catch (err) {
      console.error('Unexpected error in updateAppearanceEffects:', err);
      return false;
    }
  };

  const profileEmoji = activeProfile ? PROFILE_EMOJIS[activeProfile] : '👤';
  const currentAppearance = activeProfile ? (appearances[activeProfile] || DEFAULT_APPEARANCE[activeProfile]) : DEFAULT_APPEARANCE.Kamu;

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
        appearances,
        currentAppearance,
        updateAppearancePreset,
        uploadCustomBackground,
        uploadCustomAvatar,
        removeCustomAvatar,
        updateAppearanceEffects,
        setLocalAppearanceEffects,
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
