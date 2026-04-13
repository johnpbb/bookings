-- CreateTable
CREATE TABLE "tt_operating_days" (
    "id" SERIAL NOT NULL,
    "operating_date" DATE NOT NULL,
    "total_seats" SMALLINT NOT NULL DEFAULT 16,
    "seats_held" SMALLINT NOT NULL DEFAULT 0,
    "seats_booked" SMALLINT NOT NULL DEFAULT 0,
    "charter_vessel" VARCHAR(20),
    "is_fully_blocked" BOOLEAN NOT NULL DEFAULT false,
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tt_operating_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_bookings" (
    "id" SERIAL NOT NULL,
    "reference" VARCHAR(20) NOT NULL,
    "tour_id" VARCHAR(30) NOT NULL,
    "booking_type" VARCHAR(10) NOT NULL DEFAULT 'online',
    "assigned_vessel" VARCHAR(20),
    "guest_name" VARCHAR(120) NOT NULL,
    "guest_email" VARCHAR(120) NOT NULL,
    "guest_phone" VARCHAR(30),
    "num_guests" SMALLINT NOT NULL,
    "amount_top" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending_payment',
    "egate_order_id" VARCHAR(60),
    "egate_txn_ref" VARCHAR(60),
    "special_requests" TEXT,
    "promo_code" VARCHAR(30),
    "discount_top" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "refund_amount_top" DECIMAL(10,2),
    "refunded_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "hold_expires_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_booking_dates" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "operating_day_id" INTEGER NOT NULL,
    "tour_date" DATE NOT NULL,
    "seats_reserved" SMALLINT NOT NULL,

    CONSTRAINT "tt_booking_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_enquiries" (
    "id" SERIAL NOT NULL,
    "tour_id" VARCHAR(30) NOT NULL,
    "preferred_dates" TEXT,
    "guest_name" VARCHAR(120) NOT NULL,
    "guest_email" VARCHAR(120) NOT NULL,
    "guest_phone" VARCHAR(30),
    "group_size" SMALLINT,
    "message" TEXT,
    "whale_addon" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'new',
    "admin_notes" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_promo_codes" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "discount_type" VARCHAR(10) NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "applicable_tours" VARCHAR(255),
    "valid_date_start" DATE,
    "valid_date_end" DATE,
    "exclude_sundays" BOOLEAN NOT NULL DEFAULT false,
    "max_uses" INTEGER,
    "uses_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tt_promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_admin_users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tt_admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tt_settings" (
    "key" VARCHAR(80) NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tt_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "tt_operating_days_operating_date_key" ON "tt_operating_days"("operating_date");

-- CreateIndex
CREATE UNIQUE INDEX "tt_bookings_reference_key" ON "tt_bookings"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "tt_bookings_egate_order_id_key" ON "tt_bookings"("egate_order_id");

-- CreateIndex
CREATE INDEX "tt_bookings_status_idx" ON "tt_bookings"("status");

-- CreateIndex
CREATE INDEX "tt_bookings_guest_email_idx" ON "tt_bookings"("guest_email");

-- CreateIndex
CREATE INDEX "tt_booking_dates_booking_id_idx" ON "tt_booking_dates"("booking_id");

-- CreateIndex
CREATE INDEX "tt_booking_dates_tour_date_idx" ON "tt_booking_dates"("tour_date");

-- CreateIndex
CREATE INDEX "tt_enquiries_status_idx" ON "tt_enquiries"("status");

-- CreateIndex
CREATE INDEX "tt_enquiries_tour_id_idx" ON "tt_enquiries"("tour_id");

-- CreateIndex
CREATE UNIQUE INDEX "tt_promo_codes_code_key" ON "tt_promo_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tt_admin_users_email_key" ON "tt_admin_users"("email");

-- AddForeignKey
ALTER TABLE "tt_booking_dates" ADD CONSTRAINT "tt_booking_dates_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "tt_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tt_booking_dates" ADD CONSTRAINT "tt_booking_dates_operating_day_id_fkey" FOREIGN KEY ("operating_day_id") REFERENCES "tt_operating_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
