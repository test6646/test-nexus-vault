-- Create whatsapp_sessions table for Baileys single-file auth persisted in Supabase
create table if not exists public.whatsapp_sessions (
  id text primary key,
  session_data jsonb,
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.whatsapp_sessions enable row level security;

-- Allow all operations (permissive, consistent with project)
create policy "Allow all operations on whatsapp_sessions"
  on public.whatsapp_sessions
  for all
  using (true)
  with check (true);

-- Trigger to keep updated_at fresh
create trigger update_whatsapp_sessions_updated_at
before update on public.whatsapp_sessions
for each row execute function public.update_updated_at_column();