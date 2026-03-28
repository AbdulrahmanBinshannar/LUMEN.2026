-- COMPLETE SUPABASE SETUP SCRIPT
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Create the Users Table if it doesn't exist
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  username text unique,
  full_name text,
  phone text unique,
  fav_team text default 'Al-Hilal',
  total_points integer default 0,
  level integer default 1,
  streak_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security
alter table public.users enable row level security;

-- 3. Create Resilient RLS Policies
drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile"
  on public.users for select
  using ( auth.uid() = id );

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
  on public.users for update
  using ( auth.uid() = id );

-- Allow public read for usernames (common for features like comments/leaderboards)
drop policy if exists "Public can view usernames" on public.users;
create policy "Public can view usernames"
  on public.users for select
  using ( true );

-- 4. Create the Trigger Function for Auto-Creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 5. Bind the Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Match Comments Table
create table if not exists public.match_comments (
  id uuid default gen_random_uuid() primary key,
  match_id text not null, -- Associated with an analysis Job ID or real Match ID
  user_id uuid references public.users(id) on delete cascade,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Comment Likes Table
create table if not exists public.comment_likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  comment_id uuid references public.match_comments(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, comment_id)
);

-- Enable RLS for comments
alter table public.match_comments enable row level security;
drop policy if exists "Anyone can view comments" on public.match_comments;
create policy "Anyone can view comments" on public.match_comments for select using (true);

drop policy if exists "Authenticated users can post comments" on public.match_comments;
create policy "Authenticated users can post comments" on public.match_comments for insert with check (auth.role() = 'authenticated');

-- Enable RLS for likes
alter table public.comment_likes enable row level security;
drop policy if exists "Anyone can view likes" on public.comment_likes;
create policy "Anyone can view likes" on public.comment_likes for select using (true);

drop policy if exists "Authenticated users can like comments" on public.comment_likes;
create policy "Authenticated users can like comments" on public.comment_likes for insert with check (auth.role() = 'authenticated');

-- 8. Waitlist Table
create table if not exists public.waitlist (
  id uuid default gen_random_uuid() primary key,
  name text,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for waitlist
alter table public.waitlist enable row level security;

-- Allow anyone to insert into waitlist (lead generation)
drop policy if exists "Anyone can join the waitlist" on public.waitlist;
create policy "Anyone can join the waitlist" on public.waitlist for insert with check (true);

-- Restrict viewing waitlist (only service role or DB owner)
drop policy if exists "Waitlist is private" on public.waitlist;
create policy "Waitlist is private" on public.waitlist for select using (false);
