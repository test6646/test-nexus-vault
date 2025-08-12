-- Enable full replica identity for all sync tables to capture all changes
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.expenses REPLICA IDENTITY FULL;