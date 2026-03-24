create table if not exists public.availability_overrides (
  availability_date date primary key,
  is_closed boolean not null default false,
  available_times text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

alter table public.availability_overrides enable row level security;

revoke all on table public.availability_overrides from anon;
revoke all on table public.availability_overrides from authenticated;
