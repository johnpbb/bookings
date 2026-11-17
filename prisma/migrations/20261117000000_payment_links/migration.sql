-- Pay by link: staff-created payment links, and a link from each payment back to its link.
-- Safe to run more than once. The deploy runs it on the server before building.

BEGIN;

CREATE TABLE IF NOT EXISTS tt_payment_links (
  id SERIAL PRIMARY KEY,
  token VARCHAR(40) NOT NULL,
  amount_top DECIMAL(10, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  guest_name VARCHAR(120),
  guest_email VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  notes VARCHAR(255),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS tt_payment_links_token_key ON tt_payment_links (token);

ALTER TABLE tt_bookings ADD COLUMN IF NOT EXISTS payment_link_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tt_bookings_payment_link_id_fkey') THEN
    ALTER TABLE tt_bookings ADD CONSTRAINT tt_bookings_payment_link_id_fkey
      FOREIGN KEY (payment_link_id) REFERENCES tt_payment_links (id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS tt_bookings_payment_link_id_idx ON tt_bookings (payment_link_id);

COMMIT;
