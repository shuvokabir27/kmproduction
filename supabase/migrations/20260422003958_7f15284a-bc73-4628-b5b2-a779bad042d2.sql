-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to delete receipt files older than 24 hours
CREATE OR REPLACE FUNCTION public.cleanup_old_receipts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'receipts'
    AND created_at < now() - interval '24 hours';
END;
$$;

-- Remove existing job if any (idempotent)
SELECT cron.unschedule('cleanup-old-receipts')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-receipts');

-- Schedule cleanup every hour
SELECT cron.schedule(
  'cleanup-old-receipts',
  '0 * * * *',
  $$ SELECT public.cleanup_old_receipts(); $$
);