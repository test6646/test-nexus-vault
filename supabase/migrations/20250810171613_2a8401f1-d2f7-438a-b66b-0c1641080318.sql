-- Add header_left_content and footer_content columns to firms table if they don't exist
DO $$ 
BEGIN
    -- Add header_left_content column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'firms' AND column_name = 'header_left_content') THEN
        ALTER TABLE public.firms 
        ADD COLUMN header_left_content TEXT DEFAULT 'Contact: +91 72850 72603
Email: pritphoto1985@gmail.com';
    END IF;
    
    -- Add footer_content column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'firms' AND column_name = 'footer_content') THEN
        ALTER TABLE public.firms 
        ADD COLUMN footer_content TEXT DEFAULT 'PRIT PHOTO | Contact: +91 72850 72603 | Email: pritphoto1985@gmail.com
#aJourneyOfLoveByPritPhoto | Your memories, our passion';
    END IF;
END $$;