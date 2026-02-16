-- ============================================================================
-- SCRIPT: 03_add_constraints_and_fixes.sql
-- PURPOSE: Add critical constraints to prevent race conditions and data issues
-- CREATED: 2024-02-16
-- ============================================================================
-- This script adds:
-- 1. UNIQUE constraint to prevent double-booking
-- 2. CHECK constraints for data validation
-- 3. FOREIGN KEY constraints with CASCADE
-- 4. Indexes for performance optimization
-- ============================================================================

-- ============================================================================
-- 1. PREVENT DOUBLE-BOOKING: Add UNIQUE constraint on appointment slots
-- ============================================================================

-- Ensure no two appointments can exist at the same time for same professional
-- Only apply constraint to active appointments (not cancelled)
ALTER TABLE appointments
ADD CONSTRAINT unique_appointment_slot UNIQUE (
  professional_id,
  appointment_date,
  start_time
) WHERE status != 'cancelled';

-- Index for faster conflict detection when checking availability
CREATE INDEX idx_appointments_professional_date_time ON appointments(
  professional_id,
  appointment_date,
  start_time,
  end_time,
  status
) WHERE status IN ('scheduled', 'confirmed', 'checked_in', 'in_progress');

-- ============================================================================
-- 2. ADD CHECK CONSTRAINTS for data validation
-- ============================================================================

-- Ensure start_time is before end_time
ALTER TABLE appointments
ADD CONSTRAINT check_appointment_times CHECK (start_time < end_time);

-- Ensure appointment duration is reasonable (5 minutes to 8 hours)
ALTER TABLE appointments
ADD CONSTRAINT check_appointment_duration CHECK (
  EXTRACT(EPOCH FROM (end_time - start_time)) BETWEEN 300 AND 28800
);

-- Ensure service duration is positive
ALTER TABLE service_types
ADD CONSTRAINT check_service_duration CHECK (duration_minutes > 0);

-- Ensure schedule times are valid
ALTER TABLE schedules
ADD CONSTRAINT check_schedule_times CHECK (start_time < end_time);

-- Ensure schedule exceptions are valid
ALTER TABLE schedule_exceptions
ADD CONSTRAINT check_exception_times CHECK (
  COALESCE(start_time, '00:00'::time) < COALESCE(end_time, '23:59'::time)
);

-- ============================================================================
-- 3. PREVENT DUPLICATE NOTIFICATIONS for same event
-- ============================================================================

-- Ensure no duplicate confirmation emails for same appointment
ALTER TABLE notifications
ADD CONSTRAINT unique_appointment_notification UNIQUE (
  user_id,
  type,
  appointment_id
) WHERE appointment_id IS NOT NULL AND type IN (
  'appointment_confirmation',
  'appointment_cancelled',
  'appointment_reminder'
);

-- Ensure no duplicate notifications for same queue ticket
ALTER TABLE notifications
ADD CONSTRAINT unique_queue_notification UNIQUE (
  user_id,
  type,
  queue_ticket_id
) WHERE queue_ticket_id IS NOT NULL AND type IN (
  'queue_ready',
  'queue_called'
);

-- Index for finding notifications by user and type
CREATE INDEX idx_notifications_user_type ON notifications(user_id, type, status);

-- Index for finding pending notifications
CREATE INDEX idx_notifications_pending ON notifications(status, created_at)
WHERE status = 'pending';

-- ============================================================================
-- 4. IMPROVE FOREIGN KEY constraints
-- ============================================================================

-- Drop existing foreign keys (if they exist) - may need adjustment based on actual schema
-- Note: These names might differ; adjust based on your actual constraint names

-- Ensure when professional is deleted, appointments are handled properly
-- Option 1: Prevent deletion if appointments exist
-- Option 2: Delete appointments (uncomment if preferred)
-- ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_professional_id_fkey;
-- ALTER TABLE appointments
-- ADD CONSTRAINT appointments_professional_id_fkey FOREIGN KEY (professional_id)
-- REFERENCES professionals(id) ON DELETE RESTRICT;

-- Ensure service types can't be deleted if appointments reference them
ALTER TABLE appointments
ADD CONSTRAINT fk_appointments_service_type FOREIGN KEY (service_type_id)
REFERENCES service_types(id) ON DELETE RESTRICT;

-- Ensure organization reference is valid
ALTER TABLE appointments
ADD CONSTRAINT fk_appointments_organization FOREIGN KEY (organization_id)
REFERENCES organizations(id) ON DELETE CASCADE;

-- ============================================================================
-- 5. IDEMPOTENCY support in database
-- ============================================================================

-- Create table for tracking processed notifications (idempotency)
CREATE TABLE IF NOT EXISTS notification_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL UNIQUE REFERENCES notifications(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL UNIQUE,
  processed_at timestamp NOT NULL DEFAULT now(),
  response_payload jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_idempotency_key ON notification_idempotency(idempotency_key);

-- ============================================================================
-- 6. QUEUE MANAGEMENT improvements
-- ============================================================================

-- Ensure queue ticket numbers are unique within organization/date
CREATE UNIQUE INDEX idx_queue_ticket_code_unique ON queue_tickets(
  organization_id,
  ticket_code
) WHERE status != 'completed' AND status != 'no_show';

-- Ensure only one ticket can be in "called" status per service type
-- (optional: implement application-level logic for this)
CREATE INDEX idx_queue_tickets_called ON queue_tickets(
  service_type_id,
  status,
  called_at
) WHERE status = 'called';

-- ============================================================================
-- 7. CACHE-FRIENDLY indexes
-- ============================================================================

-- Fast lookup for professional's active schedule
CREATE INDEX idx_schedules_professional_active ON schedules(
  professional_id,
  is_active
) WHERE is_active = true;

-- Fast lookup for available slots
CREATE INDEX idx_service_types_lookup ON service_types(
  organization_id,
  id
);

-- Fast lookup for professional info
CREATE INDEX idx_professionals_organization ON professionals(
  organization_id
);

-- ============================================================================
-- 8. ADD AUDIT COLUMNS if not present
-- ============================================================================

-- Add audit columns to track changes (if not already present)
DO $$ BEGIN
  ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_by uuid;
  ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
  
  ALTER TABLE queue_tickets ADD COLUMN IF NOT EXISTS created_by uuid;
  ALTER TABLE queue_tickets ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
  
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivered_at timestamp;
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS failed_reason text;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================================
-- 9. AUDIT TRIGGER for updated_at
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for appointments
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for queue_tickets
DROP TRIGGER IF EXISTS update_queue_tickets_updated_at ON queue_tickets;
CREATE TRIGGER update_queue_tickets_updated_at
  BEFORE UPDATE ON queue_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. PERFORMANCE: Add computed columns (virtual columns)
-- ============================================================================

-- Virtual column for appointment duration (in minutes)
-- Note: PostgreSQL doesn't support GENERATED AS VIRTUAL, but we can use a view

CREATE OR REPLACE VIEW appointments_with_duration AS
SELECT 
  a.*,
  EXTRACT(EPOCH FROM (a.end_time - a.start_time))/60 AS duration_minutes
FROM appointments a;

-- Virtual column for queue wait time estimate
CREATE OR REPLACE VIEW queue_tickets_with_wait_estimate AS
SELECT 
  qt.*,
  -- Estimate: roughly 5 minutes per person in queue before you
  (SELECT COUNT(*) * 5 FROM queue_tickets WHERE 
    service_type_id = qt.service_type_id 
    AND status = 'waiting' 
    AND created_at < qt.created_at
  ) AS estimated_wait_minutes
FROM queue_tickets qt;

-- ============================================================================
-- 11. DATA INTEGRITY: Add NOT NULL constraints where missing
-- ============================================================================

-- Ensure critical fields are not null
ALTER TABLE appointments ALTER COLUMN professional_id SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN service_type_id SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN appointment_date SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN start_time SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN end_time SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN status SET NOT NULL;

ALTER TABLE queue_tickets ALTER COLUMN service_type_id SET NOT NULL;
ALTER TABLE queue_tickets ALTER COLUMN status SET NOT NULL;

ALTER TABLE notifications ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN type SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN status SET NOT NULL;

-- ============================================================================
-- 12. VERIFY all constraints were added
-- ============================================================================

-- View to check all constraints
CREATE OR REPLACE VIEW v_constraints_status AS
SELECT 
  'appointments' as table_name,
  'unique_appointment_slot' as constraint_name,
  COUNT(*) > 0 as exists
FROM information_schema.table_constraints
WHERE table_name = 'appointments' AND constraint_name = 'unique_appointment_slot'
GROUP BY table_name, constraint_name

UNION ALL

SELECT 
  'appointments',
  'check_appointment_times',
  COUNT(*) > 0
FROM information_schema.table_constraints
WHERE table_name = 'appointments' AND constraint_name = 'check_appointment_times'
GROUP BY table_name, constraint_name;

-- ============================================================================
-- EXECUTION NOTES
-- ============================================================================
/*
BEFORE RUNNING THIS SCRIPT:
1. Ensure you have a backup of your database
2. Run during low-traffic hours (if production)
3. These changes are backwards-compatible
4. Some constraints may fail if bad data exists
   - Fix with: DELETE FROM table WHERE condition;

IF CONSTRAINT FAILS TO ADD:
- Check if bad data exists (e.g., start_time >= end_time)
- Fix bad data first
- Then re-run the constraint addition

TESTING:
1. Try to book two appointments at same time → Should fail
2. Try to create appointment with end_time before start_time → Should fail
3. Check idempotency of notifications → Should work
4. Verify indexes are being used → Check query plans

MONITORING:
- Watch for unique constraint violations in Sentry
- Monitor query performance after adding indexes
- Check Dead Letter Queue for failed notifications
*/

COMMIT;
