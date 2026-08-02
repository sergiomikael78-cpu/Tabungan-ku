-- ============================================
-- Tabungan Kita — Database Schema for Supabase (Idempotent)
-- ============================================
-- Run this SQL in Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/ntkdkblfpjhjqidjhsgb/sql

-- 1. Bank Accounts Table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  nickname TEXT,
  color_tag TEXT NOT NULL DEFAULT '#10b981',
  icon_emoji TEXT NOT NULL DEFAULT '🏦',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Transactions Table (Setoran & Penarikan)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  profile_name TEXT NOT NULL CHECK (profile_name IN ('Kamu', 'Pacar')),
  type TEXT NOT NULL CHECK (type IN ('SETOR', 'TARIK')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL,
  note TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Receivables Table (Piutang)
CREATE TABLE IF NOT EXISTS receivables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  profile_name TEXT NOT NULL CHECK (profile_name IN ('Kamu', 'Pacar')),
  debtor_name TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  lent_date DATE NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'BELUM_LUNAS' CHECK (status IN ('BELUM_LUNAS', 'SEBAGIAN', 'LUNAS')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Receivable Payments Table (Pelunasan Piutang)
CREATE TABLE IF NOT EXISTS receivable_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  profile_name TEXT NOT NULL CHECK (profile_name IN ('Kamu', 'Pacar')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Profile Settings Table (Nama Tampilan Profil Shared)
CREATE TABLE IF NOT EXISTS profile_settings (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_key TEXT NOT NULL CHECK (profile_key IN ('Kamu', 'Pacar')),
  display_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, profile_key)
);


-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;


-- Bank Accounts policies
DROP POLICY IF EXISTS "Users can view own bank accounts" ON bank_accounts;
CREATE POLICY "Users can view own bank accounts"
  ON bank_accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bank accounts" ON bank_accounts;
CREATE POLICY "Users can insert own bank accounts"
  ON bank_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bank accounts" ON bank_accounts;
CREATE POLICY "Users can update own bank accounts"
  ON bank_accounts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bank accounts" ON bank_accounts;
CREATE POLICY "Users can delete own bank accounts"
  ON bank_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Receivables policies
DROP POLICY IF EXISTS "Users can view own receivables" ON receivables;
CREATE POLICY "Users can view own receivables"
  ON receivables FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own receivables" ON receivables;
CREATE POLICY "Users can insert own receivables"
  ON receivables FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own receivables" ON receivables;
CREATE POLICY "Users can update own receivables"
  ON receivables FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own receivables" ON receivables;
CREATE POLICY "Users can delete own receivables"
  ON receivables FOR DELETE
  USING (auth.uid() = user_id);

-- Receivable Payments policies (join through receivables for user check)
DROP POLICY IF EXISTS "Users can view own receivable payments" ON receivable_payments;
CREATE POLICY "Users can view own receivable payments"
  ON receivable_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM receivables
      WHERE receivables.id = receivable_payments.receivable_id
      AND receivables.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own receivable payments" ON receivable_payments;
CREATE POLICY "Users can insert own receivable payments"
  ON receivable_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM receivables
      WHERE receivables.id = receivable_payments.receivable_id
      AND receivables.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own receivable payments" ON receivable_payments;
CREATE POLICY "Users can update own receivable payments"
  ON receivable_payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM receivables
      WHERE receivables.id = receivable_payments.receivable_id
      AND receivables.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own receivable payments" ON receivable_payments;
CREATE POLICY "Users can delete own receivable payments"
  ON receivable_payments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM receivables
      WHERE receivables.id = receivable_payments.receivable_id
      AND receivables.user_id = auth.uid()
    )
  );

-- Profile Settings policies
DROP POLICY IF EXISTS "Users can view own profile settings" ON profile_settings;
CREATE POLICY "Users can view own profile settings"
  ON profile_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile settings" ON profile_settings;
CREATE POLICY "Users can insert own profile settings"
  ON profile_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile settings" ON profile_settings;
CREATE POLICY "Users can update own profile settings"
  ON profile_settings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile settings" ON profile_settings;
CREATE POLICY "Users can delete own profile settings"
  ON profile_settings FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================
-- Auto-update updated_at triggers
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_receivables_updated_at ON receivables;
CREATE TRIGGER update_receivables_updated_at
  BEFORE UPDATE ON receivables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- BR-04: Database-level Validation for Payments
-- Prevent payment from exceeding remaining receivable amount
-- ============================================

CREATE OR REPLACE FUNCTION validate_receivable_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_total_amount BIGINT;
  v_current_paid BIGINT;
  v_remaining BIGINT;
BEGIN
  SELECT amount INTO v_total_amount
  FROM receivables
  WHERE id = NEW.receivable_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_current_paid
  FROM receivable_payments
  WHERE receivable_id = NEW.receivable_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  v_remaining := v_total_amount - v_current_paid;

  IF NEW.amount > v_remaining THEN
    RAISE EXCEPTION 'Nominal pelunasan (%) melebihi sisa piutang (%)', NEW.amount, v_remaining;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_receivable_payment_limit ON receivable_payments;
CREATE TRIGGER check_receivable_payment_limit
  BEFORE INSERT OR UPDATE ON receivable_payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_receivable_payment();

-- ============================================
-- FR-14: Automatic Status Calculation Trigger
-- Update status in receivables when payment is inserted/updated/deleted
-- ============================================

CREATE OR REPLACE FUNCTION sync_receivable_status()
RETURNS TRIGGER AS $$
DECLARE
  v_rec_id UUID;
  v_total_amount BIGINT;
  v_total_paid BIGINT;
  v_new_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_rec_id := OLD.receivable_id;
  ELSE
    v_rec_id := NEW.receivable_id;
  END IF;

  SELECT amount INTO v_total_amount FROM receivables WHERE id = v_rec_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM receivable_payments WHERE receivable_id = v_rec_id;

  IF v_total_paid >= v_total_amount THEN
    v_new_status := 'LUNAS';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'SEBAGIAN';
  ELSE
    v_new_status := 'BELUM_LUNAS';
  END IF;

  UPDATE receivables SET status = v_new_status, updated_at = now() WHERE id = v_rec_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_receivable_status ON receivable_payments;
CREATE TRIGGER trg_sync_receivable_status
  AFTER INSERT OR UPDATE OR DELETE ON receivable_payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_receivable_status();

-- Resync status when amount is edited directly on receivables table
CREATE OR REPLACE FUNCTION sync_receivable_status_on_receivable_change()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid BIGINT;
  v_new_status TEXT;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM receivable_payments
  WHERE receivable_id = NEW.id;

  IF v_total_paid >= NEW.amount THEN
    v_new_status := 'LUNAS';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'SEBAGIAN';
  ELSE
    v_new_status := 'BELUM_LUNAS';
  END IF;

  NEW.status := v_new_status;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_receivable_status_on_receivable ON receivables;
CREATE TRIGGER trg_sync_receivable_status_on_receivable
  BEFORE UPDATE ON receivables
  FOR EACH ROW
  EXECUTE FUNCTION sync_receivable_status_on_receivable_change();

-- ============================================
-- Enable Realtime (Safely)
-- ============================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE bank_accounts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE receivables;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE receivable_payments;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE profile_settings;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transactions_bank ON transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);
CREATE INDEX IF NOT EXISTS idx_receivables_bank ON receivables(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_receivable_payments_receivable ON receivable_payments(receivable_id);
