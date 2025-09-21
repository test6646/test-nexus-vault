-- Remove telegram_chat_id column from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS telegram_chat_id;