create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  phone text not null,
  telegram text not null,
  note text,
  booking_date date not null,
  booking_time text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists bookings_unique_slot
  on public.bookings (booking_date, booking_time);

alter table public.bookings enable row level security;

revoke all on table public.bookings from anon;
revoke all on table public.bookings from authenticated;

create table if not exists public.availability_overrides (
  availability_date date primary key,
  is_closed boolean not null default false,
  available_times text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

alter table public.availability_overrides enable row level security;

revoke all on table public.availability_overrides from anon;
revoke all on table public.availability_overrides from authenticated;
