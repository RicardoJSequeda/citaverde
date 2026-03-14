-- ==================================================================
-- Step 1: Create the jobs table to queue background tasks
-- ==================================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id bigserial PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  -- The task identifier, e.g., 'send_reminder', 'process_payment'
  task_identifier text NOT NULL,
  -- The JSON payload for the job
  payload jsonb,
  -- The number of times the job has been attempted
  attempts integer DEFAULT 0 NOT NULL,
  -- The last error message if the job failed
  last_error text,
  -- When the job should be executed
  run_at timestamp with time zone DEFAULT now() NOT NULL,
  -- The status of the job
  status text default 'pending' check (status in ('pending', 'running', 'completed', 'failed'))
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- ==================================================================
-- Step 2: Create the function to enqueue appointment reminders
-- ==================================================================
CREATE OR REPLACE FUNCTION public.schedule_appointment_reminders() 
RETURNS void AS $$
BEGIN
  -- Find all appointments scheduled for tomorrow
  INSERT INTO public.jobs (task_identifier, payload, run_at)
  SELECT 
    'send_appointment_reminder', 
    json_build_object(
      'appointment_id', a.id,
      'patient_id', a.patient_id,
      'professional_name', p.name,
      'appointment_time', a.start_time
    ),
    -- Schedule the job to run 24 hours before the appointment
    (a.appointment_date + a.start_time) - interval '1 day'
  FROM 
    public.appointments a
  JOIN
    public.professionals p ON a.professional_id = p.id
  WHERE 
    -- Appointments for tomorrow
    a.appointment_date = (current_date + interval '1 day');
END;
$$ LANGUAGE plpgsql;

-- ==================================================================
-- Step 3: Schedule the function to run daily with pg_cron
-- This needs to be run by a superadmin on the Supabase dashboard SQL editor
-- ==================================================================
-- Enable the pg_cron extension if not already enabled
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run every day at 8:00 AM UTC
-- This will enqueue reminders for all appointments happening the *next* day.
-- SELECT cron.schedule('daily-appointment-reminders', '0 8 * * *', 'SELECT public.schedule_appointment_reminders()');

-- To unschedule:
-- SELECT cron.unschedule('daily-appointment-reminders');

