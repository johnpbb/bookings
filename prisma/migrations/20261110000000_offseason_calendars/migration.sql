-- Gives the island and game fishing trips their own calendars, separate from whale season.
-- Safe to run more than once. The deploy pipeline does not run migrations, so this has to be
-- applied to the live database by hand, immediately before the matching code is deployed.

BEGIN;

ALTER TABLE tt_operating_days ADD COLUMN IF NOT EXISTS calendar VARCHAR(20) NOT NULL DEFAULT 'whale';

DROP INDEX IF EXISTS tt_operating_days_operating_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS tt_operating_days_calendar_operating_date_key
  ON tt_operating_days (calendar, operating_date);

-- Open every Monday to Saturday through 2028 on each new calendar. Staff block dates as needed.
INSERT INTO tt_operating_days (calendar, operating_date, total_seats)
SELECT c.calendar, d::date, c.seats
FROM (VALUES ('reef', 10), ('charter_island', 10), ('charter_fishing', 4)) AS c(calendar, seats)
CROSS JOIN generate_series(CURRENT_DATE, DATE '2028-12-31', INTERVAL '1 day') AS d
WHERE EXTRACT(DOW FROM d) <> 0
ON CONFLICT (calendar, operating_date) DO NOTHING;

-- Move upcoming Outer Reef bookings off the whale calendar and onto their own.
UPDATE tt_booking_dates bd
SET operating_day_id = reef.id
FROM tt_bookings b, tt_operating_days reef
WHERE b.id = bd.booking_id
  AND b.tour_id = 'island_reef'
  AND bd.tour_date >= CURRENT_DATE
  AND reef.calendar = 'reef'
  AND reef.operating_date = bd.tour_date;

UPDATE tt_operating_days od
SET
  seats_held = COALESCE((
    SELECT SUM(bd.seats_reserved) FROM tt_booking_dates bd
    JOIN tt_bookings b ON b.id = bd.booking_id
    WHERE bd.operating_day_id = od.id AND b.status = 'pending_payment'
  ), 0),
  seats_booked = COALESCE((
    SELECT SUM(bd.seats_reserved) FROM tt_booking_dates bd
    JOIN tt_bookings b ON b.id = bd.booking_id
    WHERE bd.operating_day_id = od.id AND b.status = 'confirmed'
  ), 0);

COMMIT;
