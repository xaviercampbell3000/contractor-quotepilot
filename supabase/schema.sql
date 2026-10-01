-- QuotePilot Supabase schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text,
  customer_name text,
  job_type text,
  estimate_number text,
  labor numeric(12,2) not null default 0,
  materials numeric(12,2) not null default 0,
  other_costs numeric(12,2) not null default 0,
  markup_percent numeric(6,2) not null default 0,
  markup_amount numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.estimates enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "estimates_select_own" on public.estimates;
create policy "estimates_select_own" on public.estimates for select to authenticated using (auth.uid() = user_id);
drop policy if exists "estimates_insert_own" on public.estimates;
create policy "estimates_insert_own" on public.estimates for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "estimates_update_own" on public.estimates;
create policy "estimates_update_own" on public.estimates for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "estimates_delete_own" on public.estimates;
create policy "estimates_delete_own" on public.estimates for delete to authenticated using (auth.uid() = user_id);

create index if not exists estimates_user_id_created_at_idx on public.estimates(user_id, created_at desc);

-- Founding Plan payment entitlement
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'founding',
  status text not null default 'pending' check (status in ('pending','active','refunded','cancelled')),
  paypal_order_id text unique,
  paypal_capture_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own" on public.entitlements for select to authenticated using (auth.uid() = user_id);
grant select on public.entitlements to authenticated;
