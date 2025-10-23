CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO customers (name, email) VALUES
  ('太郎 現新', 'taro@example.com'),
  ('花子 比較', 'hanako@example.com')
ON CONFLICT DO NOTHING;