-- Habilita a extensão pg_net necessária para HTTP requests dentro do banco
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Create the database webhook (pg_net HTTP hook) for sync-google-calendar
-- This triggers the edge function on every INSERT into tb_agendamentos_triagem

CREATE OR REPLACE FUNCTION public.trigger_sync_google_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
  _anon_key text;
BEGIN
  -- Build the edge function URL
  SELECT decrypted_secret INTO _anon_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1;
  _url := current_setting('app.settings.supabase_url', true);

  -- If vault/settings not available, use hardcoded project URL
  IF _url IS NULL OR _url = '' THEN
    _url := 'https://meimmeqjwiknebrgraph.supabase.co';
  END IF;

  IF _anon_key IS NULL OR _anon_key = '' THEN
    SELECT decrypted_secret INTO _anon_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_PUBLISHABLE_KEY' LIMIT 1;
  END IF;

  PERFORM extensions.http_post(
    url := _url || '/functions/v1/sync-google-calendar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(_anon_key, '')
    ),
    body := jsonb_build_object('record', row_to_json(NEW)::jsonb)
  );

  RETURN NEW;
END;
$$;

-- Create trigger on tb_agendamentos_triagem for INSERT only
DROP TRIGGER IF EXISTS on_insert_sync_google_calendar ON public.tb_agendamentos_triagem;
CREATE TRIGGER on_insert_sync_google_calendar
  AFTER INSERT ON public.tb_agendamentos_triagem
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_google_calendar();
