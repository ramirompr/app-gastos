export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          color?: string;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          color?: string;
          parent_id?: string | null;
          created_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          description: string;
          amount: number;
          currency: 'ARS' | 'USD';
          amount_ars: number | null;
          amount_usd: number | null;
          exchange_rate_used: number | null;
          date: string;
          split_type: 'personal' | 'invited' | 'shared';
          partner_share: number | null;
          shared_with: string | null;
          is_settled: boolean;
          settled_at: string | null;
          installment_plan_id: string | null;
          installment_number: number | null;
          recurring_expense_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          description: string;
          amount: number;
          currency: 'ARS' | 'USD';
          amount_ars: number | null;
          amount_usd: number | null;
          exchange_rate_used: number | null;
          date: string;
          split_type: 'personal' | 'invited' | 'shared';
          partner_share?: number | null;
          shared_with?: string | null;
          is_settled?: boolean;
          settled_at?: string | null;
          installment_plan_id?: string | null;
          installment_number?: number | null;
          recurring_expense_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          description?: string;
          amount?: number;
          currency?: 'ARS' | 'USD';
          amount_ars?: number | null;
          amount_usd?: number | null;
          exchange_rate_used?: number | null;
          date?: string;
          split_type?: 'personal' | 'invited' | 'shared';
          partner_share?: number | null;
          shared_with?: string | null;
          is_settled?: boolean;
          settled_at?: string | null;
          installment_plan_id?: string | null;
          installment_number?: number | null;
          recurring_expense_id?: string | null;
          created_at?: string;
        };
      };
      recurring_expenses: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          description: string;
          default_amount: number;
          currency: 'ARS' | 'USD';
          day_of_month: number;
          frequency_months: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          description: string;
          default_amount: number;
          currency: 'ARS' | 'USD';
          day_of_month: number;
          frequency_months?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          description?: string;
          default_amount?: number;
          currency?: 'ARS' | 'USD';
          day_of_month?: number;
          frequency_months?: number;
          active?: boolean;
          created_at?: string;
        };
      };
      expense_installment_plans: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          description: string;
          total_amount: number;
          currency: 'ARS' | 'USD';
          num_installments: number;
          split_type: 'personal' | 'invited' | 'shared';
          partner_share: number | null;
          shared_with: string | null;
          start_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          description: string;
          total_amount: number;
          currency: 'ARS' | 'USD';
          num_installments: number;
          split_type: 'personal' | 'invited' | 'shared';
          partner_share?: number | null;
          shared_with?: string | null;
          start_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          description?: string;
          total_amount?: number;
          currency?: 'ARS' | 'USD';
          num_installments?: number;
          split_type?: 'personal' | 'invited' | 'shared';
          partner_share?: number | null;
          shared_with?: string | null;
          start_date?: string;
          created_at?: string;
        };
      };
      exchange_rates: {
        Row: {
          id: string;
          date: string;
          usd_to_ars: number;
          fetched_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          usd_to_ars: number;
          fetched_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          usd_to_ars?: number;
          fetched_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};

export type Category = Database['public']['Tables']['categories']['Row'];
export type Expense = Database['public']['Tables']['expenses']['Row'];
export type ExchangeRate = Database['public']['Tables']['exchange_rates']['Row'];
export type ExpenseInstallmentPlan = Database['public']['Tables']['expense_installment_plans']['Row'];
export type RecurringExpense = Database['public']['Tables']['recurring_expenses']['Row'];
