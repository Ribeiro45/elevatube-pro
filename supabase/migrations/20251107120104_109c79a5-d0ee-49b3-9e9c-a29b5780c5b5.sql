-- Add admin_master value to app_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'admin_master' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'admin_master';
    END IF;
END $$;