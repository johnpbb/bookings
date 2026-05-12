# Tahi Tonga Bookings — Admin User Guide

**Admin URL:** `https://bookings.tahitonga.com/admin`

---

## Contents

1. [Logging In](#1-logging-in)
2. [Dashboard](#2-dashboard)
3. [Bookings](#3-bookings)
4. [Enquiries](#4-enquiries)
5. [Season Calendar (Operating Days)](#5-season-calendar-operating-days)
6. [Packages & Tours](#6-packages--tours)
7. [Promo Codes](#7-promo-codes)
8. [Settings](#8-settings)
9. [How the Booking Process Works](#9-how-the-booking-process-works)

---

## 1. Logging In

Go to `/admin/login` and enter your admin credentials. You will be redirected to the Dashboard on success. The session stays active until you close the browser or log out.

---

## 2. Dashboard

The Dashboard is your home screen. It shows at a glance:

| Stat | What it means |
|---|---|
| **Bookings this week** | Confirmed bookings in the last 7 days |
| **Active holds** | Customers who started a booking but haven't paid yet |
| **New enquiries** | Enquiries that haven't been actioned |
| **Today's seats remaining** | Available seats for today's operating date |

Below the stats is a table of the 8 most recent confirmed bookings with guest name, tour, date, guest count, amount, and vessel assignment.

---

## 3. Bookings

**URL:** `/admin/bookings`

This page lists all bookings across all statuses. You can:

### Filter bookings
- Filter by **status**: pending payment, confirmed, cancelled, refunded
- Filter by **tour**
- Search by guest name, email, or booking reference

### View a booking
Click any row to open the booking detail panel on the right. This shows:
- Booking reference, tour, dates, guest count, amount paid
- Guest name, email, phone
- Special requests (including Dates in Tonga, WhatsApp, and per-guest details)
- Promo code used (if any)
- Payment status and eGate transaction reference

### Assign a vessel
In the booking detail panel, use the **Vessel** dropdown to assign MV Ika Nui, MV Huelo, or Hele Kosi. This is for your internal operations planning.

### Cancel a booking
1. Open the booking detail panel
2. Click **Cancel Booking**
3. Enter a reason
4. Choose a refund method:
   - **eGate** — automatic refund back to the customer's card (uses the ANZ eGate API)
   - **Manual** — marks it for manual refund, sends the customer a refund confirmation email
   - **No refund** — cancels without issuing a refund
5. The refund amount is calculated automatically based on how far in advance the cancellation is made:
   - 14+ days before: 75% refund
   - 7–13 days before: 50% refund
   - 2–6 days before: 25% refund
   - Less than 2 days: no refund

### Create a manual booking
Use the **+ New Manual Booking** button to create a booking on behalf of a guest (e.g. phone or in-person). Fill in guest details, tour, dates, number of guests, and the amount. A confirmation email is sent to the guest automatically.

---

## 4. Enquiries

**URL:** `/admin/enquiries`

All enquiry form submissions appear here. You can:

### Filter by status
Use the dropdown to show only: **New**, **Contacted**, **Confirmed**, or **Declined**.

### View an enquiry
Click **View** on any row to open the full detail — guest contact info, preferred dates, group size, message, and whether they requested a whale watch add-on.

### Update enquiry status
Change the status directly from the dropdown in the table row — no need to open the detail view.

### Add admin notes
Open the enquiry detail, type your notes in the **Admin Notes** field, and click **Save Notes**. Notes are internal and not visible to the guest.

### Reply to a guest
Click **Reply via Email** in the detail panel — this opens your email client pre-addressed to the guest.

---

## 5. Season Calendar (Operating Days)

**URL:** `/admin/operating-days`

This is where you control which dates appear on the customer-facing booking calendar and how many seats are available on each date.

### Generate a season
1. Set the **Season Start** and **Season End** dates
2. Click **Generate Season**
3. This creates Mon–Sat entries for the full date range, automatically excluding Sundays, Easter Sunday, and Christmas Day
4. Already-existing dates are not overwritten (safe to run multiple times)

### Block a date completely
In the table, find the date and set the **Charter** dropdown to **Both chartered (FULLY BLOCKED)**. The date immediately disappears from the customer calendar (no caching delay).

### Assign a vessel charter (reduces available seats)
Set the Charter dropdown to **MV Ika Nui chartered** or **MV Huelo chartered**. This reduces available seats to 8 for that date (the other vessel's seats remain bookable).

### Remove a date entirely
Click the **✕** button on the right of any row. A confirmation dialog will appear. Use this to permanently remove stray dates that shouldn't be in the system.

> **Important:** Changes to the calendar appear on the customer booking page immediately — there is no caching delay.

---

## 6. Packages & Tours

**URL:** `/admin/packages`

This is where you manage everything that appears on the booking homepage — both online bookable tours and enquiry-only packages.

### Online Bookable Packages
These are tours customers can book and pay for directly online.

For each package you can edit:
- **Package Name** and **URL ID** — the ID is used in the booking link (e.g. `/book/whale_day_trip`). Set it once and do not change it after bookings have been made against it.
- **Tagline** — the short coloured line shown under the title on the homepage
- **Description** — uses a rich text editor (bold, italic, bullet lists, headings, undo/redo). This is the main descriptive text shown on the tour card.
- **Image** — upload a JPEG, PNG, or WebP image (max 5 MB). Shows as the tour card header photo. Falls back to the emoji if no image is uploaded.
- **Price Label** — the display text shown on the card (e.g. `TOP$ 250`)
- **Price per Person (TOP$)** — the actual amount used for calculating the booking total
- **Number of Dates Required** — how many dates the customer must select (e.g. 1 for a day trip, 3 for the 3-day special)
- **Badge** — optional label shown on the card corner (e.g. "Most popular"). Leave blank for none.
- **Active on Storefront** — uncheck to hide the tour from the booking homepage without deleting it

### Enquiry-Only Packages
These show on the homepage under "Enquiry-Based Bookings". Customers fill in an enquiry form — there is no online payment.

For each package you can edit: Name, URL ID, Tagline, Description, Image, and Active status.

### Moving a tour between Online and Enquiry
- On any online tour card, click **Move to Enquiry →** to convert it to enquiry-only
- On any enquiry tour card, click **← Move to Online Booking** to enable direct booking (you'll need to set the price and date count)
- A confirmation dialog appears before any move

### Adding a new package
- Click **+ Add Online Package** or **+ Add Enquiry Package** at the bottom of the relevant section
- A new blank card appears — fill in all the fields
- New packages are set to **inactive** by default so they don't appear on the storefront until you're ready
- Tick **Active on Storefront** when ready to publish

### Saving changes
All edits are held in memory until you click **Save All Changes** (available at both the top and bottom of the page). Remember to save after any changes including moves, additions, and image uploads.

---

## 7. Promo Codes

**URL:** `/admin/promo-codes`

Create and manage discount codes that customers can enter at checkout.

### Create a new code
Click **+ New Code** and fill in:

| Field | Description |
|---|---|
| **Code** | The code customers enter (e.g. `FRINGE2026`). Automatically uppercased. |
| **Discount Type** | Fixed amount (TOP$) or Percentage (%) |
| **Discount Value** | The amount or percentage |
| **Applicable Tours** | Tick specific tours, or leave all unticked to apply to all tours |
| **Valid From / Valid To** | Optional date range the code is active within |
| **Max Uses** | Optional cap on how many times the code can be used. Leave blank for unlimited. |
| **Exclude Sundays** | If ticked, the code cannot be used on bookings that include a Sunday date |
| **Notes** | Internal note — not visible to customers |

### Deactivate / reactivate a code
Click **Deactivate** or **Activate** in the table row. Deactivated codes are rejected at checkout but remain in the system.

### Usage tracking
The **Uses** column shows how many times the code has been used (and the maximum if one was set).

---

## 8. Settings

**URL:** `/admin/settings`

### ANZ eGate Payment Gateway
Your ANZ payment gateway credentials. Contact your developer before changing these.

| Field | Description |
|---|---|
| **Merchant ID** | Your ANZ merchant identifier |
| **Shared Secret** | API password for ANZ eGate |
| **Production Endpoint URL** | The ANZ API endpoint |
| **Mode** | Sandbox (test mode) or Production (live). Must be set to **Production** for real payments. |

### Booking Settings

| Field | Description |
|---|---|
| **Hold Duration (minutes)** | How long a seat hold lasts before it expires. Default: 20 minutes. |

### Payment Surcharge / Handling Fee
Controls the surcharge shown to customers at checkout and added to the amount charged.

| Field | Description |
|---|---|
| **Enable** | Tick to activate the surcharge. Untick to disable completely. |
| **Fee Display Text** | The label shown to customers (e.g. `Service Fee (4%)`) |
| **Applicable Amount Type** | Percentage or Fixed flat fee |
| **Amount** | The percentage (e.g. `4` for 4%) or fixed amount in TOP$ |

### Operator
**Operator Email** — all new booking alerts and enquiry notifications are sent to this address.

### Whale Season
Sets the default season date range used when generating operating days.

### Confirmation Email Content
These fields control what appears in the booking confirmation email sent to guests:
- **Meeting Point Instructions** — where to meet on the day
- **Inclusions** — what's included in the tour
- **What to Bring** — gear/preparation advice

Changes here take effect immediately for all future confirmation emails.

---

## 9. How the Booking Process Works

Understanding the end-to-end flow helps with troubleshooting and managing bookings.

### Online Booking Flow

```
Customer selects date(s)
        ↓
Customer fills in details (name, email, phone, guest info, checkboxes)
        ↓
Customer reviews booking + enters promo code (optional)
        ↓
Customer clicks "Hold Seats & Pay"
→ Seats are locked for 20 minutes (configurable in Settings)
→ Booking created with status: Pending Payment
        ↓
Customer completes payment via ANZ eGate
        ↓
ANZ redirects back → system verifies payment
→ Booking status changes to: Confirmed
→ Confirmation email sent to customer
→ Alert email sent to operator
```

### Seat Hold Expiry
If a customer doesn't complete payment within the hold window (default 20 minutes), their hold is automatically released and the seats become available again. The booking is cancelled automatically by a background job that runs periodically.

### Booking Statuses

| Status | Meaning |
|---|---|
| **Pending Payment** | Hold placed, awaiting payment |
| **Confirmed** | Payment received, booking is locked in |
| **Cancelled** | Cancelled by admin or hold expired |
| **Refunded** | Cancelled with a refund processed |

### Enquiry Flow
```
Customer submits enquiry form
        ↓
Enquiry notification sent to operator email
        ↓
Enquiry appears in Admin → Enquiries with status: New
        ↓
Admin contacts guest, updates status to "Contacted"
        ↓
Admin updates status to "Confirmed" or "Declined"
```

---

## Quick Reference — Common Tasks

| Task | Where |
|---|---|
| See today's seat availability | Dashboard |
| View/cancel a booking | Bookings |
| Assign a vessel to a booking | Bookings → open booking → Vessel dropdown |
| Create a manual booking | Bookings → + New Manual Booking |
| Action an enquiry | Enquiries |
| Block a date on the calendar | Operating Days → set Charter to "Both chartered (FULLY BLOCKED)" |
| Delete a stray date | Operating Days → ✕ button |
| Move Outer Reef to enquiry-only | Packages → "Move to Enquiry →" on that card |
| Add a new tour | Packages → + Add Online Package or + Add Enquiry Package |
| Upload a tour image | Packages → "Upload Image" on the tour card |
| Create a discount code | Promo Codes → + New Code |
| Change the payment surcharge | Settings → Payment Surcharge section |
| Edit confirmation email content | Settings → Confirmation Email Content section |
| Change operator email address | Settings → Operator |
