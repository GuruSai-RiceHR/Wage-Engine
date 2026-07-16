-- ====================================================================
-- 🇮🇳 WAGE CODE VALIDATOR - DATABASE SCHEMA
-- Target Database: PostgreSQL 14+ (Cloud compatible)
-- Description: Core tables, enums, keys, indexes, and triggers
-- ====================================================================

-- 1. Create custom enum for role segregation if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN 
    CREATE TYPE user_role AS ENUM ('USER', 'ADMIN'); 
  END IF; 
END $$;

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  company_name VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'USER',
  is_paid BOOLEAN DEFAULT FALSE,
  simple_trial_used INT DEFAULT 0,
  dynamic_trial_used INT DEFAULT 0,
  validation_count INT DEFAULT 0,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for searching users by email quickly
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Create Validation History Table (Stores user calculations)
CREATE TABLE IF NOT EXISTS validation_history (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  mode VARCHAR(20) NOT NULL,              -- 'SIMPLE' or 'DYNAMIC'
  components JSONB NOT NULL,              -- Array of input components
  status VARCHAR(50) NOT NULL,            -- 'COMPLIANT' or 'NON_COMPLIANT'
  issues JSONB,                           -- String array of compliance errors
  suggestions JSONB,                      -- Suggested adjustments
  recommended_structure JSONB,            -- Remodelled salary configuration
  financial_impact JSONB,                 -- PF & Gratuity liability delta
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for user calculations history queries (chronological)
CREATE INDEX IF NOT EXISTS idx_val_history_user_id ON validation_history(user_id, created_at DESC);

-- 4. Create Validation Logs Table (Security and telemetry analytics)
CREATE TABLE IF NOT EXISTS validation_logs (
  id SERIAL PRIMARY KEY,
  validation_id INT REFERENCES validation_history(id) ON DELETE SET NULL,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  browser VARCHAR(255),
  device VARCHAR(255),
  operating_system VARCHAR(255),
  ip_address VARCHAR(100),
  api_endpoint VARCHAR(255) NOT NULL,
  http_status INT NOT NULL,
  execution_time INT,                     -- Processing speed in ms
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for analyzing telemetry logs by endpoint & status code
CREATE INDEX IF NOT EXISTS idx_val_logs_user_created ON validation_logs(user_id, created_at DESC);

-- 5. Create Login History Table (Security telemetry)
CREATE TABLE IF NOT EXISTS login_history (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  login_status VARCHAR(50) NOT NULL,      -- 'SUCCESS' or 'FAILED'
  browser VARCHAR(255),
  device VARCHAR(255),
  operating_system VARCHAR(255),
  ip_address VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for monitoring user sign-in events
CREATE INDEX IF NOT EXISTS idx_login_history_user_created ON login_history(user_id, created_at DESC);

-- 6. Create Audit Logs Table (Admin activity log)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,            -- e.g., 'ROLE_UPDATE', 'UPGRADE_PLAN'
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for admin audit checks
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- 7. Automatic timestamp updates function for modified items
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE OR REPLACE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
