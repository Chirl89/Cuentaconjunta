-- ==============================================================================
-- FitDuo / Cuentaconjunta - Supabase Database Schema Migration
-- Version: v0.3.0
-- Description: Complete PostgreSQL schema with households, multi-user profiles,
--              PSD2 bank connections, accounts, transactions with transfer support,
--              rules, AI category learnings, and settlements.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. HOUSEHOLDS
CREATE TABLE IF NOT EXISTS public.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Hogar Común',
    member_a_name TEXT NOT NULL DEFAULT 'Persona A',
    member_b_name TEXT NOT NULL DEFAULT 'Persona B',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_households_updated_at
BEFORE UPDATE ON public.households
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. USERS (Profiles linked to Supabase Auth or standalone)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. BANK CONNECTIONS (PSD2 Open Banking via GoCardless)
CREATE TABLE IF NOT EXISTS public.bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL,
    requisition_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'INIT',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_bank_connections_updated_at
BEFORE UPDATE ON public.bank_connections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. ACCOUNTS (Bank accounts, cards or cash boxes)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES public.bank_connections(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    gocardless_account_id TEXT,
    name TEXT NOT NULL,
    iban_mask TEXT,
    ownership TEXT NOT NULL CHECK (ownership IN ('USER_A', 'USER_B', 'JOINT')) DEFAULT 'JOINT',
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'EUR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL DEFAULT 'Tag',
    color TEXT NOT NULL DEFAULT '#00D09C',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    monthly_budget NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. CATEGORY LEARNINGS (Feedback Loop AI memory per merchant)
CREATE TABLE IF NOT EXISTS public.category_learnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    merchant_pattern TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_category_learning UNIQUE (household_id, merchant_pattern)
);

-- 8. RULES (Automated split and assignment rules)
CREATE TABLE IF NOT EXISTS public.rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    pattern TEXT NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    assign_to TEXT NOT NULL CHECK (assign_to IN ('USER_A', 'USER_B', 'JOINT')),
    split_ratio NUMERIC(5, 2) NOT NULL DEFAULT 0.50,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_rules_updated_at
BEFORE UPDATE ON public.rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. TRANSACTIONS (Bank feeds, manual expenses, transfers and initial balances)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tx_hash TEXT UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    description TEXT NOT NULL,
    booking_date DATE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    is_joint BOOLEAN NOT NULL DEFAULT TRUE,
    split_ratio NUMERIC(5, 2) NOT NULL DEFAULT 0.50,
    status TEXT NOT NULL CHECK (status IN ('pending_assignment', 'auto_assigned', 'verified', 'neutral_transfer')) DEFAULT 'pending_assignment',
    origin TEXT NOT NULL CHECK (origin IN ('bank', 'manual', 'cash', 'transfer_internal', 'transfer_settlement', 'initial_balance')) DEFAULT 'bank',
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_booking_date ON public.transactions(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_origin ON public.transactions(origin);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON public.transactions(tx_hash);

-- 10. SETTLEMENTS (Live debt resolutions and bilateral debt settlements)
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_settlements_updated_at
BEFORE UPDATE ON public.settlements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. INITIAL SEED: System Categories
INSERT INTO public.categories (name, icon, color, is_system, monthly_budget)
VALUES
    ('Supermercado', 'ShoppingCart', '#10B981', TRUE, 450.00),
    ('Vivienda', 'Home', '#6366F1', TRUE, 850.00),
    ('Suministros', 'Zap', '#F59E0B', TRUE, 150.00),
    ('Restaurantes y Bares', 'UtensilsCrossed', '#F97316', TRUE, 200.00),
    ('Ocio y Cultura', 'Ticket', '#EC4899', TRUE, 100.00),
    ('Transporte', 'Car', '#06B6D4', TRUE, 120.00),
    ('Salud y Bienestar', 'HeartPulse', '#8B5CF6', TRUE, 80.00),
    ('Mascotas', 'PawPrint', '#14B8A6', TRUE, 60.00),
    ('Traspaso / Liquidación', 'ArrowLeftRight', '#00D09C', TRUE, NULL),
    ('Otros', 'MoreHorizontal', '#64748B', TRUE, 100.00)
ON CONFLICT (name) DO UPDATE SET
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_system = EXCLUDED.is_system;

-- 12. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Base permissive policies for public/anon in development & household member scoping in production
CREATE POLICY "Public categories are viewable by all users"
ON public.categories FOR SELECT USING (TRUE);

CREATE POLICY "Users can view and manage their own household"
ON public.households FOR ALL USING (TRUE);

CREATE POLICY "Users can manage user profiles"
ON public.users FOR ALL USING (TRUE);

CREATE POLICY "Users can manage their bank connections"
ON public.bank_connections FOR ALL USING (TRUE);

CREATE POLICY "Users can manage their accounts"
ON public.accounts FOR ALL USING (TRUE);

CREATE POLICY "Users can manage category learnings"
ON public.category_learnings FOR ALL USING (TRUE);

CREATE POLICY "Users can manage rules"
ON public.rules FOR ALL USING (TRUE);

CREATE POLICY "Users can manage transactions"
ON public.transactions FOR ALL USING (TRUE);

CREATE POLICY "Users can manage settlements"
ON public.settlements FOR ALL USING (TRUE);
