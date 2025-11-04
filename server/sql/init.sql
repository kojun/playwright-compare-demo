CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Default user: admin / Demo2024!
INSERT INTO users (username, password_hash) VALUES
  ('admin', '$2b$10$2zTBICrndWHJn52EJBkq8.Xer0mc4cOexzWLCMFhAMBM0YhXHKTTa')
ON CONFLICT DO NOTHING;

INSERT INTO customers (name, email) VALUES
  ('太郎 現新', 'taro@example.com'),
  ('花子 比較', 'hanako@example.com')
ON CONFLICT DO NOTHING;