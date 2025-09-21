-- Add document_url field to accounting_entries table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounting_entries' 
        AND column_name = 'document_url'
    ) THEN
        ALTER TABLE accounting_entries 
        ADD COLUMN document_url TEXT NULL;
    END IF;
END $$;