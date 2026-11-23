CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(254) UNIQUE NOT NULL,
  phone_number VARCHAR(12) UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  payment_status VARCHAR NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  mpesa_receipt VARCHAR,
  survey_completed BOOLEAN NOT NULL DEFAULT FALSE,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  citation_styles TEXT[] NOT NULL DEFAULT '{}',
  turnaround_speed VARCHAR,
  bio_sample TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkout_request_id VARCHAR UNIQUE NOT NULL,
  merchant_request_id VARCHAR,
  amount INTEGER NOT NULL DEFAULT 80 CHECK (amount = 80),
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  mpesa_receipt_number VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gigs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(240) NOT NULL,
  subject VARCHAR(80) NOT NULL,
  citation_style VARCHAR(40) NOT NULL,
  word_count VARCHAR(80) NOT NULL,
  deadline VARCHAR(120) NOT NULL,
  budget_kes INTEGER NOT NULL CHECK (budget_kes > 0),
  description TEXT NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'taken')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gig_id INTEGER NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  applicant_note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, gig_id)
);

CREATE TABLE IF NOT EXISTS community_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS applications_gig_id_idx ON applications(gig_id);
CREATE INDEX IF NOT EXISTS community_posts_created_at_idx ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS gigs_status_created_at_idx ON gigs(status, created_at DESC);
