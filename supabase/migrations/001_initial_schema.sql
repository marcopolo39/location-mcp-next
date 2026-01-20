-- Locations table
create table if not exists public.locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  timestamp timestamptz not null default now()
);

-- Enable RLS
alter table public.locations enable row level security;

-- Policy: Users can only read/write their own location
create policy "Users can manage their own location"
  on public.locations for all
  using (auth.uid() = user_id);

-- API Keys table
create table if not exists public.api_keys (
  key uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.api_keys enable row level security;

-- Policy: Users can only read/write their own API keys
create policy "Users can manage their own API keys"
  on public.api_keys for all
  using (auth.uid() = user_id);

-- Index for faster lookups
create index if not exists idx_api_keys_user_id on public.api_keys(user_id);
