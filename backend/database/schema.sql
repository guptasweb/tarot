-- ============================================================================
-- TAROT READING APPLICATION - DATABASE SCHEMA
-- Session-based credits system (NO user accounts or authentication)
-- ============================================================================

-- ============================================================================
-- GUEST SESSIONS (Main entity - replaces users)
-- ============================================================================

CREATE TABLE guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  session_token VARCHAR(255) UNIQUE NOT NULL, -- URL-safe token for accessing session
  email VARCHAR(255), -- Optional, only if they want receipt
  
  -- Credits (session-specific)
  credits_balance INTEGER DEFAULT 0 CHECK (credits_balance >= 0),
  total_credits_purchased INTEGER DEFAULT 0,
  total_credits_spent INTEGER DEFAULT 0,
  
  -- Stripe payment tracking
  stripe_customer_id VARCHAR(255), -- Optional, for returning customers
  
  -- Access & Expiry
  expires_at TIMESTAMP NOT NULL, -- Guest session expires after 30 days
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_guest_token (session_token),
  INDEX idx_guest_expiry (expires_at),
  INDEX idx_guest_email (email)
);

-- ============================================================================
-- CREDIT PACKAGES (What users can purchase)
-- ============================================================================

CREATE TABLE credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Package details
  name VARCHAR(100) NOT NULL, -- "Single Reading", "3-Pack", "5-Pack", etc.
  credits INTEGER NOT NULL CHECK (credits > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0), -- Store in cents (499 = $4.99)
  
  -- Stripe integration
  stripe_price_id VARCHAR(255) UNIQUE, -- For Stripe Price object
  
  -- Display & availability
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- Special offers
  is_promotional BOOLEAN DEFAULT false,
  discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_packages_active (is_active, display_order)
);

-- ============================================================================
-- CREDIT TRANSACTIONS (Purchase & Usage tracking)
-- ============================================================================

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_session_id UUID REFERENCES guest_sessions(id) ON DELETE CASCADE,
  
  -- Transaction details
  type VARCHAR(20) NOT NULL, -- purchase, usage, refund, admin_grant, expiry
  amount INTEGER NOT NULL, -- Positive for credits added, negative for used
  balance_after INTEGER NOT NULL, -- Snapshot of balance after this transaction
  
  -- Payment info (for purchases)
  price_cents INTEGER, -- How much they paid
  stripe_payment_intent_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  payment_status VARCHAR(20), -- pending, succeeded, failed, refunded
  
  -- Usage info (for reading usage)
  reading_session_id UUID, -- FK added later after reading_sessions table
  
  -- Refund info
  refund_reason TEXT,
  refunded_transaction_id UUID REFERENCES credit_transactions(id),
  
  -- Metadata
  metadata JSONB, -- Flexible data (promo codes, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_transactions_guest (guest_session_id, created_at DESC),
  INDEX idx_transactions_type (type),
  INDEX idx_transactions_stripe_payment (stripe_payment_intent_id),
  INDEX idx_transactions_stripe_checkout (stripe_checkout_session_id),
  INDEX idx_transactions_session (reading_session_id)
);

-- ============================================================================
-- READING TYPES & DEFINITIONS
-- ============================================================================

CREATE TABLE reading_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  slug VARCHAR(50) UNIQUE NOT NULL, -- 'living_reading', 'shadow_dialogue', etc.
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  
  -- Pricing
  credits_cost INTEGER NOT NULL CHECK (credits_cost > 0),
  
  -- Configuration
  config JSONB NOT NULL DEFAULT '{
    "chatWindowHours": 48,
    "maxMessages": null,
    "allowedSpreads": ["three_card", "celtic_cross"],
    "requiresQuestionRefinement": true,
    "includesShadowReading": false,
    "includesArchetypeAnalysis": false,
    "phaseFlow": ["question", "draw", "interpret", "chat"]
  }'::jsonb,
  
  -- Display
  tagline VARCHAR(255),
  features JSONB, -- Array of feature bullets
  best_for TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_reading_types_active (is_active, display_order),
  INDEX idx_reading_types_slug (slug)
);

-- ============================================================================
-- READING SESSIONS (Individual tarot readings)
-- ============================================================================

CREATE TABLE reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_session_id UUID REFERENCES guest_sessions(id) ON DELETE CASCADE,
  reading_type_id UUID REFERENCES reading_types(id),
  
  -- Session details
  reading_type_slug VARCHAR(50) NOT NULL, -- Denormalized for quick access
  credits_used INTEGER NOT NULL,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'active', -- active, completed, expired, cancelled
  current_phase VARCHAR(50) DEFAULT 'init', -- init, question, draw, interpret, chat
  
  -- Question
  original_question TEXT,
  refined_question TEXT,
  question_context JSONB, -- User's elaborations during refinement
  
  -- Cards drawn
  spread_type VARCHAR(50), -- three_card, celtic_cross, custom, etc.
  cards_drawn JSONB, -- Array of card objects with positions
  /*
  Example:
  [
    {
      "position": 1,
      "positionName": "Past",
      "card": {
        "name": "The Fool",
        "arcana": "major",
        "number": 0,
        "orientation": "upright",
        "imageUrl": "..."
      }
    }
  ]
  */
  
  -- User insights (collected during Socratic dialogue)
  user_insights JSONB DEFAULT '[]'::jsonb,
  /*
  [
    {
      "timestamp": "2025-01-20T10:30:00Z",
      "cardReference": "The Fool",
      "insight": "I see myself at the edge of something new..."
    }
  ]
  */
  
  -- Agent state (for LangGraph persistence)
  agent_state JSONB,
  
  -- Timing
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL, -- Based on reading type config
  last_activity_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Export tracking
  transcript_generated BOOLEAN DEFAULT false,
  transcript_url VARCHAR(500),
  transcript_generated_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB, -- Ratings, feedback, flags
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_sessions_guest (guest_session_id, created_at DESC),
  INDEX idx_sessions_status (status, expires_at),
  INDEX idx_sessions_type (reading_type_slug),
  INDEX idx_sessions_expiry (expires_at) -- For cleanup jobs
);

-- Add FK from credit_transactions to reading_sessions
ALTER TABLE credit_transactions 
ADD CONSTRAINT fk_transactions_session 
FOREIGN KEY (reading_session_id) 
REFERENCES reading_sessions(id) 
ON DELETE SET NULL;

-- ============================================================================
-- MESSAGES (Chat within reading sessions)
-- ============================================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES reading_sessions(id) ON DELETE CASCADE,
  
  -- Message content
  role VARCHAR(20) NOT NULL, -- user, assistant, system, tool
  content TEXT NOT NULL,
  
  -- Rich content support
  content_type VARCHAR(20) DEFAULT 'text', -- text, markdown, card_reveal
  
  -- Metadata
  metadata JSONB,
  /*
  {
    "cardReferences": ["The Fool", "The Tower"],
    "ragSources": [
      {
        "type": "card_meaning",
        "cardName": "The Fool",
        "excerpt": "..."
      }
    ],
    "toolCalls": [
      {
        "tool": "query_card_meanings",
        "params": {...},
        "result": {...}
      }
    ],
    "tokens": {
      "prompt": 1200,
      "completion": 450
    }
  }
  */
  
  -- AI tracking
  model_used VARCHAR(50), -- claude-opus-4, claude-sonnet-4, etc.
  tokens_prompt INTEGER,
  tokens_completion INTEGER,
  
  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_messages_session (session_id, created_at ASC),
  INDEX idx_messages_role (role)
);

-- ============================================================================
-- CARDS & SPREADS (Reference Data)
-- ============================================================================

CREATE TABLE tarot_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Card identity
  name VARCHAR(100) UNIQUE NOT NULL,
  arcana VARCHAR(20) NOT NULL, -- major, minor
  suit VARCHAR(20), -- wands, cups, swords, pentacles, NULL for major
  rank VARCHAR(20), -- ace, 2-10, page, knight, queen, king, NULL for major
  number INTEGER, -- 0-21 for major, 1-14 for minor
  
  -- Assets
  image_url_upright VARCHAR(500),
  image_url_reversed VARCHAR(500),
  
  -- Basic meanings (for quick reference, not primary RAG source)
  keywords_upright JSONB, -- ["new beginnings", "innocence", "spontaneity"]
  keywords_reversed JSONB,
  summary_upright TEXT,
  summary_reversed TEXT,
  
  -- Associations
  element VARCHAR(20), -- fire, water, air, earth, spirit
  astrological_sign VARCHAR(50),
  numerology INTEGER,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_cards_arcana (arcana),
  INDEX idx_cards_suit (suit)
);

CREATE TABLE spread_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Structure
  num_cards INTEGER NOT NULL,
  positions JSONB NOT NULL,
  /*
  [
    {
      "position": 1,
      "name": "Past",
      "description": "What has led to this moment",
      "x": 100,
      "y": 200
    },
    ...
  ]
  */
  
  -- Usage
  difficulty VARCHAR(20), -- beginner, intermediate, advanced
  best_for JSONB, -- ["decision-making", "relationship-insight"]
  
  -- Display
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_spreads_active (is_active, display_order)
);

-- ============================================================================
-- TRANSCRIPTS (Exported readings)
-- ============================================================================

CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES reading_sessions(id) ON DELETE SET NULL,
  guest_session_id UUID REFERENCES guest_sessions(id) ON DELETE CASCADE,
  
  -- File details
  format VARCHAR(20) NOT NULL, -- markdown, html, json, pdf
  file_url VARCHAR(500) NOT NULL, -- S3/R2 URL
  file_size_bytes INTEGER,
  
  -- Export configuration
  include_metadata BOOLEAN DEFAULT true,
  include_timestamps BOOLEAN DEFAULT false,
  style_template VARCHAR(50), -- minimal, mystical, academic
  
  -- Access control
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP,
  
  -- Expiry (auto-delete after 90 days)
  expires_at TIMESTAMP NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_transcripts_guest (guest_session_id, created_at DESC),
  INDEX idx_transcripts_session (session_id),
  INDEX idx_transcripts_expiry (expires_at)
);

-- ============================================================================
-- ANALYTICS & TRACKING
-- ============================================================================

CREATE TABLE session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES reading_sessions(id) ON DELETE CASCADE,
  guest_session_id UUID REFERENCES guest_sessions(id) ON DELETE SET NULL,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL,
  /*
  Types:
  - session_started
  - question_refined
  - cards_drawn
  - interpretation_viewed
  - message_sent
  - phase_changed
  - session_completed
  - session_expired
  - transcript_exported
  */
  
  event_data JSONB,
  
  -- Context
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes (for analytics queries)
  INDEX idx_events_session (session_id, created_at ASC),
  INDEX idx_events_type (event_type, created_at DESC),
  INDEX idx_events_guest (guest_session_id, created_at DESC)
);

CREATE TABLE reading_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES reading_sessions(id) ON DELETE CASCADE,
  guest_session_id UUID REFERENCES guest_sessions(id) ON DELETE SET NULL,
  
  -- Ratings
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
  helpfulness_rating INTEGER CHECK (helpfulness_rating BETWEEN 1 AND 5),
  
  -- Qualitative feedback
  what_worked_well TEXT,
  what_could_improve TEXT,
  would_use_again BOOLEAN,
  
  -- Follow-up
  outcome_reported BOOLEAN DEFAULT false,
  outcome_notes TEXT,
  outcome_reported_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_feedback_session (session_id),
  INDEX idx_feedback_rating (overall_rating, created_at DESC)
);

-- ============================================================================
-- SYSTEM CONFIGURATION
-- ============================================================================

CREATE TABLE system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed system config
INSERT INTO system_config (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Enable to prevent new sessions'),
  ('max_concurrent_sessions_per_guest', '3', 'Prevent abuse'),
  ('session_cleanup_hours', '720', 'Delete expired sessions after 30 days'),
  ('transcript_expiry_days', '90', 'Auto-delete transcripts after 90 days'),
  ('max_message_length', '2000', 'Character limit per message'),
  ('rate_limit_messages_per_hour', '100', 'Prevent spam'),
  ('guest_session_expiry_days', '30', 'Guest sessions expire after 30 days');

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guest_sessions_updated_at BEFORE UPDATE ON guest_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reading_sessions_updated_at BEFORE UPDATE ON reading_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reading_types_updated_at BEFORE UPDATE ON reading_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER credit_packages_updated_at BEFORE UPDATE ON credit_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tarot_cards_updated_at BEFORE UPDATE ON tarot_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update last_activity_at when message is sent
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reading_sessions 
  SET last_activity_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_update_activity AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_session_activity();

-- Update last_accessed_at when guest session is accessed
CREATE OR REPLACE FUNCTION update_guest_session_access()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE guest_sessions 
  SET last_accessed_at = NOW()
  WHERE id = NEW.guest_session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reading_sessions_update_access AFTER INSERT ON reading_sessions
  FOR EACH ROW EXECUTE FUNCTION update_guest_session_access();

-- Validate credit balance before creating reading session
CREATE OR REPLACE FUNCTION check_credit_balance()
RETURNS TRIGGER AS $$
DECLARE
  guest_balance INTEGER;
  required_credits INTEGER;
BEGIN
  SELECT credits_balance INTO guest_balance 
  FROM guest_sessions WHERE id = NEW.guest_session_id;
  
  SELECT credits_cost INTO required_credits
  FROM reading_types WHERE id = NEW.reading_type_id;
  
  IF guest_balance < required_credits THEN
    RAISE EXCEPTION 'Insufficient credits: have %, need %', guest_balance, required_credits;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reading_sessions_check_credits BEFORE INSERT ON reading_sessions
  FOR EACH ROW EXECUTE FUNCTION check_credit_balance();

-- Deduct credits when reading session is created
CREATE OR REPLACE FUNCTION deduct_credits_on_session()
RETURNS TRIGGER AS $$
DECLARE
  credits_cost INTEGER;
  new_balance INTEGER;
BEGIN
  SELECT rt.credits_cost INTO credits_cost
  FROM reading_types rt
  WHERE rt.id = NEW.reading_type_id;
  
  -- Deduct credits from guest session
  UPDATE guest_sessions
  SET 
    credits_balance = credits_balance - credits_cost,
    total_credits_spent = total_credits_spent + credits_cost
  WHERE id = NEW.guest_session_id
  RETURNING credits_balance INTO new_balance;
  
  -- Create credit transaction record
  INSERT INTO credit_transactions (
    guest_session_id,
    type,
    amount,
    balance_after,
    reading_session_id,
    metadata
  ) VALUES (
    NEW.guest_session_id,
    'usage',
    -credits_cost,
    new_balance,
    NEW.id,
    jsonb_build_object('reading_type_slug', NEW.reading_type_slug)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reading_sessions_deduct_credits AFTER INSERT ON reading_sessions
  FOR EACH ROW EXECUTE FUNCTION deduct_credits_on_session();

-- ============================================================================
-- VIEWS (For common queries)
-- ============================================================================

-- Active reading sessions with guest info
CREATE VIEW active_sessions_view AS
SELECT 
  rs.id,
  rs.guest_session_id,
  gs.session_token,
  rs.reading_type_slug,
  rt.name AS reading_type_name,
  rs.status,
  rs.current_phase,
  rs.started_at,
  rs.expires_at,
  rs.last_activity_at,
  (SELECT COUNT(*) FROM messages WHERE session_id = rs.id) AS message_count
FROM reading_sessions rs
JOIN guest_sessions gs ON gs.id = rs.guest_session_id
JOIN reading_types rt ON rt.id = rs.reading_type_id
WHERE rs.status = 'active' AND rs.expires_at > NOW();

-- Guest session stats
CREATE VIEW guest_stats_view AS
SELECT 
  gs.id AS guest_session_id,
  gs.session_token,
  gs.email,
  gs.credits_balance,
  gs.total_credits_purchased,
  gs.total_credits_spent,
  COUNT(DISTINCT rs.id) AS total_readings,
  COUNT(DISTINCT rs.id) FILTER (WHERE rs.status = 'completed') AS completed_readings,
  MAX(rs.created_at) AS last_reading_at,
  AVG(rf.overall_rating) AS avg_rating,
  COUNT(DISTINCT t.id) AS transcripts_downloaded
FROM guest_sessions gs
LEFT JOIN reading_sessions rs ON rs.guest_session_id = gs.id
LEFT JOIN reading_feedback rf ON rf.guest_session_id = gs.id
LEFT JOIN transcripts t ON t.guest_session_id = gs.id
GROUP BY gs.id, gs.session_token, gs.email, gs.credits_balance, gs.total_credits_purchased, gs.total_credits_spent;

-- Reading type performance
CREATE VIEW reading_type_performance AS
SELECT 
  rt.slug,
  rt.name,
  rt.credits_cost,
  COUNT(DISTINCT rs.id) AS total_sessions,
  COUNT(DISTINCT rs.id) FILTER (WHERE rs.status = 'completed') AS completed_sessions,
  AVG(
    EXTRACT(EPOCH FROM (rs.completed_at - rs.started_at)) / 60
  ) AS avg_duration_minutes,
  AVG(
    (SELECT COUNT(*) FROM messages WHERE session_id = rs.id)
  ) AS avg_messages_per_session,
  AVG(rf.overall_rating) AS avg_rating
FROM reading_types rt
LEFT JOIN reading_sessions rs ON rs.reading_type_id = rt.id
LEFT JOIN reading_feedback rf ON rf.session_id = rs.id
GROUP BY rt.id, rt.slug, rt.name, rt.credits_cost;
