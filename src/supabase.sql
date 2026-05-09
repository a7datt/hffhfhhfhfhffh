-- Database Schema for SYB API
-- IMPORTANT: Run this entire script in your Supabase SQL Editor.

-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: admins
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin for testing (admin@sybapi.com / admin123)
-- Hash generated for 'admin123' (bcrypt)
INSERT INTO admins (email, password_hash) VALUES 
('admin@sybapi.com', '$2b$10$wYmI0tQzC7p.97J1.Xg6aOpV.3O3EaIu3I/6aKk/nO8eI2K1b4yS.') 
ON CONFLICT DO NOTHING;

-- Table: subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active', -- active, expired
  max_wallets INTEGER DEFAULT 1,
  current_balance DECIMAL(10, 2) DEFAULT 0.00,
  auto_renew BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: api_keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(50) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Table: wallets
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;

INSERT INTO system_settings (key, value) VALUES
('deposit_wallet_id', NULL),
('deposit_wallet_address', NULL),
('syp_to_usd_rate', '15000')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(255),
  account_number VARCHAR(255),
  name VARCHAR(255) DEFAULT 'Deposit Wallet',
  status VARCHAR(50) DEFAULT 'pending',
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE admin_wallets DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255),
  account_number VARCHAR(255),
  name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, active, inactive, expired
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: deposit_requests
CREATE TABLE IF NOT EXISTS deposit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_usd DECIMAL(10,2),
  tx_id VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, pending_verification, approved, rejected
  verification_method VARCHAR(50) DEFAULT 'auto',
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);

-- ==========================================
-- FIX EXISTING CONSTRAINTS
-- ==========================================
ALTER TABLE wallets ALTER COLUMN wallet_address DROP NOT NULL;
ALTER TABLE wallets ALTER COLUMN account_number DROP NOT NULL;

-- ==========================================
-- DISABLE ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Since this architecture relies entirely on the Node.js/Express backend 
-- for all database interactions (using the Service Role Key), we do NOT 
-- want Supabase to block requests due to RLS. Here we explicitly disable RLS.
-- This ensures no "permission denied for table X" errors occur so long as
-- the backend is controlling access.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_requests DISABLE ROW LEVEL SECURITY;
