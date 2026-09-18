-- ==============================================================================
-- FitDuo / Cuentaconjunta: Household Cloud Synchronization Schema
-- Permite persistencia cross-device instantánea (PC, iPhone, iPad) sin login obligatorio.
-- ==============================================================================

-- 1. Tabla de Estado Global del Hogar
CREATE TABLE IF NOT EXISTS public.household_state (
    household_code TEXT PRIMARY KEY,
    transactions JSONB NOT NULL DEFAULT '[]'::jsonb,
    accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
    settlements JSONB NOT NULL DEFAULT '{}'::jsonb,
    categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.household_state ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acceso para el Código de Hogar (FITDUO)
DROP POLICY IF EXISTS "Allow household read" ON public.household_state;
CREATE POLICY "Allow household read" ON public.household_state
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow household insert" ON public.household_state;
CREATE POLICY "Allow household insert" ON public.household_state
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow household update" ON public.household_state;
CREATE POLICY "Allow household update" ON public.household_state
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Registrar en Publicación Realtime para Sincronización Automática entre Dispositivos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'household_state'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.household_state;
    END IF;
END $$;
