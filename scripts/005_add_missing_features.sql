-- Add missing columns for queue management
ALTER TABLE service_types ADD COLUMN IF NOT EXISTS closure_reason TEXT;
ALTER TABLE service_types ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE service_types ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE service_types ADD COLUMN IF NOT EXISTS max_wait_time INTEGER;
ALTER TABLE service_types ADD COLUMN IF NOT EXISTS target_wait_minutes INTEGER DEFAULT 15;

-- Add missing columns for appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_email TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_phone TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reschedule_token TEXT;

-- Add check-in window to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS check_in_window_minutes INTEGER DEFAULT 15;

-- Create QR scan logs table
CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code TEXT NOT NULL,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('appointment', 'queue')),
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_qr_code ON qr_scan_logs(qr_code);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_user_id ON qr_scan_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scanned_at ON qr_scan_logs(scanned_at);

-- Enable RLS on qr_scan_logs
ALTER TABLE qr_scan_logs ENABLE ROW LEVEL SECURITY;

-- Admin can view all logs
CREATE POLICY "Admins can view all scan logs"
  ON qr_scan_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Anyone can insert logs (for tracking)
CREATE POLICY "Anyone can insert scan logs"
  ON qr_scan_logs FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Create function to generate reschedule tokens
CREATE OR REPLACE FUNCTION generate_reschedule_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reschedule_token IS NULL THEN
    NEW.reschedule_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate reschedule tokens
DROP TRIGGER IF EXISTS set_reschedule_token ON appointments;
CREATE TRIGGER set_reschedule_token
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION generate_reschedule_token();

-- Create function to send queue position notifications
CREATE OR REPLACE FUNCTION notify_queue_position()
RETURNS TRIGGER AS $$
DECLARE
  tickets_ahead INTEGER;
  patient_user_id UUID;
BEGIN
  -- Only notify when ticket is called
  IF NEW.status = 'called' AND OLD.status = 'waiting' THEN
    -- Find next waiting tickets in same queue
    FOR patient_user_id IN
      SELECT DISTINCT patient_id
      FROM queue_tickets
      WHERE service_type_id = NEW.service_type_id
        AND status = 'waiting'
        AND patient_id IS NOT NULL
        AND ticket_number > NEW.ticket_number
      ORDER BY ticket_number
      LIMIT 5
    LOOP
      -- Count tickets ahead
      SELECT COUNT(*) INTO tickets_ahead
      FROM queue_tickets
      WHERE service_type_id = NEW.service_type_id
        AND status = 'waiting'
        AND patient_id = patient_user_id
        AND ticket_number < (
          SELECT ticket_number FROM queue_tickets WHERE patient_id = patient_user_id AND status = 'waiting' LIMIT 1
        );

      -- Send notification if 3 or fewer tickets ahead
      IF tickets_ahead <= 3 THEN
        INSERT INTO notifications (user_id, type, channel, subject, message, status)
        VALUES (
          patient_user_id,
          'queue_position_alert',
          'email',
          'Your Turn is Coming Soon',
          format('Only %s ticket(s) ahead of you. Please be ready!', tickets_ahead),
          'pending'
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for queue position notifications
DROP TRIGGER IF EXISTS queue_position_notification ON queue_tickets;
CREATE TRIGGER queue_position_notification
  AFTER UPDATE ON queue_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_queue_position();

COMMENT ON TABLE qr_scan_logs IS 'Audit log for all QR code scans with device metadata';
COMMENT ON FUNCTION notify_queue_position IS 'Automatically notifies users when their turn is approaching';
