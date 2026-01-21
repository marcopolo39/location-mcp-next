-- Migration: Hash API keys for secure storage
-- Raw keys will no longer be stored; only SHA-256 hashes

-- Add new columns
alter table public.api_keys add column if not exists id uuid default gen_random_uuid();
alter table public.api_keys add column if not exists key_hash text;
alter table public.api_keys add column if not exists key_prefix text;

-- For existing keys, generate hash and prefix from the current raw key
-- (This is a one-time migration; new keys will be hashed on creation)
update public.api_keys 
set 
  key_hash = encode(sha256(key::text::bytea), 'hex'),
  key_prefix = left(key::text, 8)
where key_hash is null;

-- Now make key_hash required
alter table public.api_keys alter column key_hash set not null;
alter table public.api_keys alter column key_prefix set not null;

-- Drop the old primary key constraint
alter table public.api_keys drop constraint api_keys_pkey;

-- Add new primary key on id
alter table public.api_keys add primary key (id);

-- Create index on key_hash for fast lookups
create index if not exists idx_api_keys_key_hash on public.api_keys(key_hash);

-- Drop the raw key column (no longer needed)
alter table public.api_keys drop column key;
