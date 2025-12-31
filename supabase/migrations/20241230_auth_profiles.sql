-- Migration: Auth Profiles
-- Created: 2024-12-30
-- Description: Creates profiles table with usage tracking for LinWheel auth

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  generation_count integer default 0 not null,
  subscription_status text default 'free',
  interested_in_pro boolean default false,
  interested_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS policies
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Function to increment generation count (used by API)
create or replace function public.increment_generation_count(user_id uuid)
returns void as $$
begin
  update public.profiles
  set generation_count = generation_count + 1
  where id = user_id;
end;
$$ language plpgsql security definer;

-- Grant execute permission on the function
grant execute on function public.increment_generation_count(uuid) to authenticated;
grant execute on function public.increment_generation_count(uuid) to service_role;
