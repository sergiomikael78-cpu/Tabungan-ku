export type Profile = {
  id: string;
  name: string;
  avatar_emoji: string;
};

export type BankAccount = {
  id: string;
  user_id: string;
  bank_name: string;
  nickname: string;
  color_tag: string;
  icon_emoji: string;
  is_archived: boolean;
  created_at: string;
};

export type TransactionType = 'SETOR' | 'TARIK';

export type Transaction = {
  id: string;
  user_id: string;
  bank_account_id: string;
  profile_name: string;
  type: TransactionType;
  amount: number;
  transaction_date: string;
  note: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
  bank_accounts?: BankAccount;
};

export type ReceivableStatus = 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS';

export type Receivable = {
  id: string;
  user_id: string;
  bank_account_id: string;
  profile_name: string;
  debtor_name: string;
  amount: number;
  lent_date: string;
  due_date: string | null;
  status: ReceivableStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  bank_accounts?: BankAccount;
};

export type ReceivablePayment = {
  id: string;
  receivable_id: string;
  bank_account_id: string;
  profile_name: string;
  amount: number;
  payment_date: string;
  note: string | null;
  created_at: string;
  bank_accounts?: BankAccount;
};

export type BankWithBalance = BankAccount & {
  balance: number;
};

export type ReceivableWithPayments = Receivable & {
  receivable_payments: ReceivablePayment[];
  total_paid: number;
  remaining: number;
};

export type ProfileSetting = {
  user_id: string;
  profile_key: 'Kamu' | 'Pacar';
  display_name: string;
  updated_at?: string;
};

