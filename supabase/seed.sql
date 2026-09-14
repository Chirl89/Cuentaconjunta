-- ==============================================================================
-- FitDuo / Cuentaconjunta - Seed Data for Local Development & Testing
-- ==============================================================================

-- 1. Household
INSERT INTO public.households (id, name, member_a_name, member_b_name)
VALUES ('11111111-1111-1111-1111-111111111111', 'Casa Familiar', 'Persona A', 'Persona B')
ON CONFLICT (id) DO NOTHING;

-- 2. Users
INSERT INTO public.users (id, email, display_name, household_id)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'persona.a@example.com', 'Persona A', '11111111-1111-1111-1111-111111111111'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'persona.b@example.com', 'Persona B', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- 3. Accounts
INSERT INTO public.accounts (id, user_id, name, iban_mask, ownership, balance)
VALUES
    ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BBVA Nómina', 'ES..1234', 'USER_A', 1450.00),
    ('33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Santander Personal', 'ES..5678', 'USER_B', 820.50),
    ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cuenta Conjunta Sabadell', 'ES..9012', 'JOINT', 2300.00)
ON CONFLICT (id) DO NOTHING;
