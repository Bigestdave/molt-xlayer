
-- Create wallet_sessions table
CREATE TABLE public.wallet_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  personality TEXT NOT NULL,
  creature_name TEXT,
  creature_state TEXT DEFAULT 'alive',
  active_vault JSONB,
  deposit JSONB,
  earned_usd NUMERIC DEFAULT 0,
  rebalance_count INTEGER DEFAULT 0,
  screen TEXT DEFAULT 'dashboard',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_sessions ENABLE ROW LEVEL SECURITY;

-- Public read access (wallet-based lookup, no auth)
CREATE POLICY "Anyone can read wallet sessions"
  ON public.wallet_sessions FOR SELECT
  USING (true);

-- Public insert access
CREATE POLICY "Anyone can create wallet sessions"
  ON public.wallet_sessions FOR INSERT
  WITH CHECK (true);

-- Public update access
CREATE POLICY "Anyone can update wallet sessions"
  ON public.wallet_sessions FOR UPDATE
  USING (true);

-- Create timestamp trigger
CREATE OR REPLACE FUNCTION public.update_wallet_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_wallet_sessions_updated_at
  BEFORE UPDATE ON public.wallet_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_sessions_updated_at();

-- Index for fast wallet lookups
CREATE INDEX idx_wallet_sessions_address ON public.wallet_sessions (wallet_address);
