-- ============================================================================
-- DUNNING TOOL — FULL DATABASE SCHEMA
-- Supabase PostgreSQL schema with Row Level Security (RLS)
-- ============================================================================
-- Run this in the Supabase SQL Editor to initialize your production schema.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. STRIPE CONNECTIONS
-- Stores each user's encrypted Stripe API key and validation status.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stripe_connections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Encrypted Stripe secret key (encrypt at application layer, store ciphertext here)
    stripe_api_key_encrypted TEXT NOT NULL DEFAULT '',
    
    -- Whether the stored key currently validates against Stripe
    is_valid        BOOLEAN NOT NULL DEFAULT false,
    
    -- Stripe account ID returned from Stripe (e.g., acct_xxx)
    stripe_account_id TEXT,
    
    -- Human-readable label the user can assign
    account_label   TEXT,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- One active Stripe connection per user
    CONSTRAINT stripe_connections_user_id_unique UNIQUE (user_id)
);

COMMENT ON TABLE public.stripe_connections IS 'Encrypted Stripe API credentials per user';
COMMENT ON COLUMN public.stripe_connections.stripe_api_key_encrypted IS 'Application-layer encrypted Stripe secret key (never store plaintext)';

-- ============================================================================
-- 2. FAILED PAYMENTS
-- Core table: every failed Stripe PaymentIntent synced for dunning.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.failed_payments (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Stripe identifiers
    stripe_payment_intent_id  TEXT NOT NULL,
    stripe_customer_id          TEXT,
    stripe_invoice_id           TEXT,
    
    -- Customer info (denormalised from Stripe for fast email lookup)
    customer_email          TEXT NOT NULL,
    customer_name           TEXT,
    
    -- Payment details
    amount                  INTEGER NOT NULL,          -- in smallest currency unit (cents)
    currency                TEXT NOT NULL DEFAULT 'usd', -- ISO 4217, lowercase
    
    -- Failure context
    failure_code            TEXT,                        -- e.g. card_declined, insufficient_funds
    failure_message         TEXT,                        -- Stripe's human-readable message
    decline_code            TEXT,                        -- e.g. insufficient_funds, expired_card
    
    -- Dunning state machine
    status                  TEXT NOT NULL DEFAULT 'failed',
                                    -- allowed: failed, dunning, recovered, abandoned, cancelled
    retry_count             INTEGER NOT NULL DEFAULT 0,
    last_retry_at           TIMESTAMPTZ,
    next_retry_at           TIMESTAMPTZ,
    recovered_at            TIMESTAMPTZ,
    abandoned_at            TIMESTAMPTZ,
    
    -- Metadata
    description             TEXT,
    metadata                JSONB DEFAULT '{}',
    
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Prevent duplicate payment intents per user
    CONSTRAINT failed_payments_stripe_id_unique UNIQUE (user_id, stripe_payment_intent_id)
);

COMMENT ON TABLE public.failed_payments IS 'Failed Stripe PaymentIntents queued for dunning recovery';
COMMENT ON COLUMN public.failed_payments.status IS 'Lifecycle: failed → dunning → recovered | abandoned | cancelled';

-- Indexes for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_failed_payments_user_status ON public.failed_payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_failed_payments_next_retry  ON public.failed_payments(user_id, next_retry_at) WHERE status IN ('failed', 'dunning');
CREATE INDEX IF NOT EXISTS idx_failed_payments_created       ON public.failed_payments(user_id, created_at DESC);

-- ============================================================================
-- 2.5 RECOVERY ATTEMPTS
-- Tracks each scheduled/executed dunning attempt for a failed payment.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recovery_attempts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    failed_payment_id   UUID NOT NULL REFERENCES public.failed_payments(id) ON DELETE CASCADE,
    
    attempt_number      INTEGER NOT NULL DEFAULT 1,
    status              TEXT NOT NULL DEFAULT 'scheduled',
                            -- allowed: scheduled, sent, opened, clicked, bounced, failed, success, cancelled
    
    -- Scheduling
    scheduled_at        TIMESTAMPTZ NOT NULL,
    sent_at             TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    
    -- Email content snapshot
    email_subject       TEXT,
    email_body          TEXT,
    
    -- Engagement tracking
    opened_at           TIMESTAMPTZ,
    clicked_at          TIMESTAMPTZ,
    
    -- Result
    result              TEXT,     -- success, failed, bounced, no_response, cancelled
    error_message       TEXT,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.recovery_attempts IS 'Individual dunning recovery attempts per failed payment';

CREATE INDEX IF NOT EXISTS idx_recovery_attempts_payment ON public.recovery_attempts(failed_payment_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_recovery_attempts_user_status ON public.recovery_attempts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recovery_attempts_scheduled ON public.recovery_attempts(user_id, scheduled_at) WHERE status = 'scheduled';

ALTER TABLE public.recovery_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recovery_attempts"
    ON public.recovery_attempts
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own recovery_attempts"
    ON public.recovery_attempts
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own recovery_attempts"
    ON public.recovery_attempts
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE TRIGGER recovery_attempts_updated_at
    BEFORE UPDATE ON public.recovery_attempts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. EMAIL LOGS
-- Audit trail for every dunning email sent (and engagement tracking).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_logs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Link to the failed payment this email was about
    failed_payment_id   UUID REFERENCES public.failed_payments(id) ON DELETE SET NULL,
    
    -- Email classification
    email_type          TEXT NOT NULL,
                            -- e.g. dunning_1, dunning_2, dunning_3, final_notice, recovered, custom
    
    -- Recipients & content snapshot
    recipient_email     TEXT NOT NULL,
    recipient_name      TEXT,
    subject             TEXT NOT NULL,
    body_text           TEXT,                         -- Optional: store plaintext body for audit
    body_html           TEXT,                         -- Optional: store HTML body for audit
    
    -- Delivery & engagement tracking
    status              TEXT NOT NULL DEFAULT 'pending',
                            -- allowed: pending, sent, delivered, opened, clicked, bounced, failed, complained, unsubscribed
    provider_message_id TEXT,                         -- Message-ID from SMTP / email provider
    
    -- Engagement timestamps
    sent_at             TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    opened_at           TIMESTAMPTZ,
    clicked_at          TIMESTAMPTZ,
    bounced_at          TIMESTAMPTZ,
    failed_at           TIMESTAMPTZ,
    
    -- Failure details
    bounce_reason       TEXT,
    error_message       TEXT,
    
    -- Metadata
    ip_address          TEXT,
    user_agent          TEXT,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_logs IS 'Audit trail and engagement tracking for dunning emails';

-- Indexes for dashboard analytics
CREATE INDEX IF NOT EXISTS idx_email_logs_user_payment   ON public.email_logs(user_id, failed_payment_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_status    ON public.email_logs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_type      ON public.email_logs(user_id, email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at        ON public.email_logs(user_id, sent_at DESC);

-- ============================================================================
-- 4. USER SETTINGS
-- Per-user app configuration: branding, SMTP, retry schedule, notifications.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Company / sender branding
    company_name            TEXT,
    sender_email            TEXT,
    sender_name             TEXT,
    reply_to_email          TEXT,
    
    -- SMTP configuration (application-encrypted values)
    smtp_host               TEXT,
    smtp_port               INTEGER DEFAULT 587,
    smtp_user               TEXT,
    smtp_pass_encrypted     TEXT,                     -- Never store plaintext passwords
    smtp_secure             BOOLEAN DEFAULT false,    -- true = TLS on 465, false = STARTTLS on 587
    
    -- Dunning behaviour
    retry_schedule          JSONB DEFAULT '[1, 3, 7]',  -- Days to wait between dunning attempts, e.g. [1,3,7]
    max_retries             INTEGER DEFAULT 3,
    auto_send               BOOLEAN NOT NULL DEFAULT false, -- Automatically send dunning emails?
    
    -- Notification preferences
    notification_mode       TEXT NOT NULL DEFAULT 'both',
                                    -- allowed: email, dashboard, both, none
    notify_on_recovery      BOOLEAN DEFAULT true,
    notify_on_abandon       BOOLEAN DEFAULT true,
    
    -- Content customisation
    email_subject_template  TEXT DEFAULT 'Your payment failed — here's how to fix it',
    email_body_template     TEXT,                     -- Optional custom HTML template override
    
    -- Locale / formatting
    timezone                TEXT DEFAULT 'UTC',
    currency_display        TEXT DEFAULT 'symbol',    -- symbol, code, name
    
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_settings IS 'Per-user configuration for dunning behaviour, SMTP, and branding';
COMMENT ON COLUMN public.user_settings.retry_schedule IS 'JSON array of days between retry attempts, e.g. [1,3,7]';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Users can ONLY read/write rows that belong to them (user_id = auth.uid()).
-- ============================================================================

ALTER TABLE public.stripe_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings      ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- STRIPE CONNECTIONS POLICIES
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own stripe_connections"
    ON public.stripe_connections
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own stripe_connections"
    ON public.stripe_connections
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own stripe_connections"
    ON public.stripe_connections
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own stripe_connections"
    ON public.stripe_connections
    FOR DELETE
    USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- FAILED PAYMENTS POLICIES
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own failed_payments"
    ON public.failed_payments
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own failed_payments"
    ON public.failed_payments
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own failed_payments"
    ON public.failed_payments
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own failed_payments"
    ON public.failed_payments
    FOR DELETE
    USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- EMAIL LOGS POLICIES
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own email_logs"
    ON public.email_logs
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own email_logs"
    ON public.email_logs
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own email_logs"
    ON public.email_logs
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own email_logs"
    ON public.email_logs
    FOR DELETE
    USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- USER SETTINGS POLICIES
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own user_settings"
    ON public.user_settings
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own user_settings"
    ON public.user_settings
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own user_settings"
    ON public.user_settings
    FOR UPDATE
    USING (user_id = auth.uid());

-- No DELETE policy for user_settings — deleting the auth.user cascades anyway.

-- ============================================================================
-- AUTOMATIC `updated_at` TRIGGER
-- Keeps updated_at fresh on every row mutation.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stripe_connections_updated_at
    BEFORE UPDATE ON public.stripe_connections
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER failed_payments_updated_at
    BEFORE UPDATE ON public.failed_payments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER email_logs_updated_at
    BEFORE UPDATE ON public.email_logs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- AUTO-CREATE user_settings ROW ON SIGN-UP (OPTIONAL CONVENIENCE)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to Supabase auth user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
