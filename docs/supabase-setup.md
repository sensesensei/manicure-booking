# Supabase Setup

## 1. Create a project

1. Open Supabase and create a new project.
2. Wait until the database is fully initialized.
3. Open the project settings and copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key

## 2. Create the `bookings` table

1. Open the SQL editor in Supabase.
2. Copy the contents of `supabase/bookings.sql` into the editor.
3. Run the script.

The table will contain:
- client name
- phone
- Telegram
- comment
- booking date
- booking time
- created timestamp

It also creates a unique index so one slot cannot be booked twice.
The script enables Row Level Security and revokes browser-side access from `anon` and `authenticated`, because this project works through server API routes with a secret/service key.

## 3. Configure local environment

Create a `.env.local` file in the project root with these values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_SECRET_KEY=your_secret_key
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Notes:
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` is used on the server side only.
- The project supports both `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.
- If Supabase shows you only a publishable key in the dashboard, you can place it into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.
- If Supabase shows you a `Secret key` instead of the legacy `service_role` key, place it into `SUPABASE_SECRET_KEY`.
- Telegram variables can stay empty for now.
- Once these values are added, the UI badge should switch from `demo mode` to `supabase`.

## 4. Restart the local app

Run:

```powershell
cd C:\Users\Admin\manicure-booking\manicure-booking
npm.cmd run dev
```

## 5. Smoke test

1. Open the landing page.
2. Make sure the badge says `supabase`.
3. Create a booking.
4. Refresh the page.
5. Check that:
   - the slot remains booked
   - the booking is no longer lost after reload

## 6. Current status

The project already includes:
- admin login with a protected session cookie
- admin booking list by date
- delete/cancel action from the admin page
- day availability editor
- Telegram notifications for created bookings
- Telegram notifications for deleted bookings
- Telegram test message from the admin page

For the Telegram part, follow the dedicated guide in `docs/telegram-setup.md`.
