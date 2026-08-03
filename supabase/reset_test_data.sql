-- ============================================
-- Saving Vision — Reset Test Data Script
-- ============================================
-- Run this SQL in Supabase SQL Editor to wipe all test transactions & dummy data.
-- This script PRESERVES your user login account (auth.users) and profile settings.

-- 1. Hapus seluruh data transaksi pelunasan piutang
TRUNCATE TABLE receivable_payments CASCADE;

-- 2. Hapus seluruh data piutang
TRUNCATE TABLE receivables CASCADE;

-- 3. Hapus seluruh data transaksi setor & tarik
TRUNCATE TABLE transactions CASCADE;

-- 4. Hapus seluruh akun rekening bank percobaan
TRUNCATE TABLE bank_accounts CASCADE;

-- Catatan:
-- Akun login (auth.users), nama profil (profile_settings), 
-- dan personalisasi background (profile_appearance) KETIGA-NYA TETAP UTUH.
