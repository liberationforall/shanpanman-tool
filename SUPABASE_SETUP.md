# Supabase Configuration for OSINT Submissions

Run the following SQL commands in your Supabase project's SQL Editor to create the necessary table and storage bucket for the OSINT Evidence workflow:

```sql
-- 1. Create the submissions table
create table public.submissions (
  id uuid default gen_random_uuid() primary key,
  strike_id text not null,
  strike_public_id text,
  strike_name text,
  strike_location text,
  strike_description text,
  evidence_description text,
  image_path text not null,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS and setup a policy to allow public anonymous inserts
alter table public.submissions enable row level security;

create policy "Allow anonymous submission inserts" 
on public.submissions for insert 
with check ( true );

-- 2. Create the form-images storage bucket
-- Note: You can also do this manually in the Supabase Dashboard under 'Storage'
insert into storage.buckets (id, name, public) 
values ('form-images', 'form-images', false);

-- Set basic access policies for the storage bucket
-- This creates an open policy for users to anonymously INSERT images.
create policy "Allow anonymous image uploads" 
on storage.objects for insert 
with check (bucket_id = 'form-images');
```
