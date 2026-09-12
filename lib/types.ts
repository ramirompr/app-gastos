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
          amount_ars: number;
          amount_usd: number;
          exchange_rate_used: number;
          date: string;
          split_type: 'personal' | 'invited' | 'shared';
          partner_share: number | null;
          is_settled: boolean;
          settled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          description: string;
          amount: number;
          currency: 'ARS' | 'USD';
          amount_ars: number;
          amount_usd: number;
          exchange_rate_used: number;
          date: string;
          split_type: 'personal' | 'invited' | 'shared';
          partner_share?: number | null;
          is_settled?: boolean;
          settled_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          description?: string;
          amount?: number;
          currency?: 'ARS' | 'USD';
          amount_ars?: number;
          amount_usd?: number;
          exchange_rate_used?: number;
          date?: string;
          split_type?: 'personal' | 'invited' | 'shared';
          partner_share?: number | null;
          is_settled?: boolean;
          settled_at?: string | null;
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
