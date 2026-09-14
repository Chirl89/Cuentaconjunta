/**
 * FitDuo / Cuentaconjunta - Supabase Database Types
 * Strongly typed & immutable schema definitions for PostgreSQL.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Ownership = "USER_A" | "USER_B" | "JOINT";

export type TransactionStatus =
  | "pending_assignment"
  | "auto_assigned"
  | "verified"
  | "neutral_transfer";

export type TransactionOrigin =
  | "bank"
  | "manual"
  | "cash"
  | "transfer_internal"
  | "transfer_settlement"
  | "initial_balance";

export type BankConnectionStatus = "INIT" | "LINKED" | "EXPIRED" | "ERROR";

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          member_a_name: string;
          member_b_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          member_a_name?: string;
          member_b_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          member_a_name?: string;
          member_b_name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          avatar_url: string | null;
          household_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name: string;
          avatar_url?: string | null;
          household_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          avatar_url?: string | null;
          household_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      bank_connections: {
        Row: {
          id: string;
          user_id: string;
          institution_id: string;
          requisition_id: string;
          status: BankConnectionStatus | string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          institution_id: string;
          requisition_id: string;
          status?: BankConnectionStatus | string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          institution_id?: string;
          requisition_id?: string;
          status?: BankConnectionStatus | string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          connection_id: string | null;
          user_id: string;
          gocardless_account_id: string | null;
          name: string;
          iban_mask: string | null;
          ownership: Ownership;
          balance: number;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          connection_id?: string | null;
          user_id: string;
          gocardless_account_id?: string | null;
          name: string;
          iban_mask?: string | null;
          ownership?: Ownership;
          balance?: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string | null;
          user_id?: string;
          gocardless_account_id?: string | null;
          name?: string;
          iban_mask?: string | null;
          ownership?: Ownership;
          balance?: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          icon: string;
          color: string;
          is_system: boolean;
          monthly_budget: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          icon?: string;
          color?: string;
          is_system?: boolean;
          monthly_budget?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string;
          color?: string;
          is_system?: boolean;
          monthly_budget?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      category_learnings: {
        Row: {
          id: string;
          household_id: string;
          merchant_pattern: string;
          category_id: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          merchant_pattern: string;
          category_id: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          merchant_pattern?: string;
          category_id?: string;
          updated_at?: string;
        };
      };
      rules: {
        Row: {
          id: string;
          household_id: string;
          pattern: string;
          account_id: string | null;
          assign_to: Ownership;
          split_ratio: number;
          category_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          pattern: string;
          account_id?: string | null;
          assign_to: Ownership;
          split_ratio?: number;
          category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          pattern?: string;
          account_id?: string | null;
          assign_to?: Ownership;
          split_ratio?: number;
          category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          account_id: string | null;
          user_id: string;
          tx_hash: string | null;
          amount: number;
          currency: string;
          description: string;
          booking_date: string;
          category_id: string | null;
          is_joint: boolean;
          split_ratio: number;
          status: TransactionStatus;
          origin: TransactionOrigin;
          assigned_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id?: string | null;
          user_id: string;
          tx_hash?: string | null;
          amount: number;
          currency?: string;
          description: string;
          booking_date: string;
          category_id?: string | null;
          is_joint?: boolean;
          split_ratio?: number;
          status?: TransactionStatus;
          origin?: TransactionOrigin;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string | null;
          user_id?: string;
          tx_hash?: string | null;
          amount?: number;
          currency?: string;
          description?: string;
          booking_date?: string;
          category_id?: string | null;
          is_joint?: boolean;
          split_ratio?: number;
          status?: TransactionStatus;
          origin?: TransactionOrigin;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      settlements: {
        Row: {
          id: string;
          household_id: string;
          payer_id: string;
          receiver_id: string;
          amount: number;
          date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          payer_id: string;
          receiver_id: string;
          amount: number;
          date: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          payer_id?: string;
          receiver_id?: string;
          amount?: number;
          date?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      ownership: Ownership;
      transaction_status: TransactionStatus;
      transaction_origin: TransactionOrigin;
      bank_connection_status: BankConnectionStatus;
    };
  };
}

// Convenience Type Aliases for Application Code
export type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TableUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type UserRow = TableRow<"users">;
export type HouseholdRow = TableRow<"households">;
export type BankConnectionRow = TableRow<"bank_connections">;
export type AccountRow = TableRow<"accounts">;
export type CategoryRow = TableRow<"categories">;
export type CategoryLearningRow = TableRow<"category_learnings">;
export type RuleRow = TableRow<"rules">;
export type TransactionRow = TableRow<"transactions">;
export type SettlementRow = TableRow<"settlements">;
