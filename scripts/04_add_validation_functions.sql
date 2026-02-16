-- ============================================================================
-- SCRIPT: 04_add_validation_functions.sql
-- PURPOSE: Add database functions for complex validation and business logic
-- CREATED: 2024-02-16
-- ============================================================================
-- This script adds:
-- 1. Function to check appointment availability
-- 2. Function to get available slots
-- 3. Function to validate appointment creation
-- 4. Function to handle queue operations
-- 5. Function to manage notifications safely
-- ============================================================================

-- ============================================================================
-- 1. FUNCTION: Check if a time slot is available
-- ============================================================================

CREATE OR REPLACE FUNCTION is_slot_available(
  p_professional_id uuid,
  p_date date,
  p_start_time time,
  p_end_time time,
  p_exclude_appointment_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_conflict_count integer;
BEGIN
  -- Check if any appointment overlaps with requested slot
  SELECT COUNT(*) INTO v_conflict_count
  FROM appointments
  WHERE 
    professional_id = p_professional_id
    AND appointment_date = p_date
    AND status IN ('scheduled', 'confirmed', 'checked_in', 'in_progress')
    AND (p_exclude_appointment_id IS NULL OR id != p_exclude_appointment_id)
    AND (
      (start_time < p_end_time AND end_time > p_start_time)
      OR (start_time = p_start_time)
    );
  
  RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 2. FUNCTION: Check professional is available (schedule check)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_professional_available(
  p_professional_id uuid,
  p_date date,
  p_start_time time
)
RETURNS boolean AS $$
DECLARE
  v_day_of_week integer;
  v_schedule_exists boolean;
  v_is_exception_available boolean;
BEGIN
  -- Get day of week (0=Sunday, 1=Monday, ... 6=Saturday)
  v_day_of_week := EXTRACT(ISODOW FROM p_date) - 1; -- Convert to 0-6
  
  -- Check for schedule exception first
  SELECT 
    COALESCE(is_available, true) INTO v_is_exception_available
  FROM schedule_exceptions
  WHERE 
    professional_id = p_professional_id 
    AND date = p_date
  LIMIT 1;
  
  -- If exception says not available, return false
  IF v_is_exception_available IS FALSE THEN
    RETURN false;
  END IF;
  
  -- Check regular schedule
  SELECT EXISTS(
    SELECT 1 FROM schedules
    WHERE 
      professional_id = p_professional_id
      AND day_of_week = v_day_of_week
      AND is_active = true
      AND start_time <= p_start_time
      AND end_time > p_start_time
  ) INTO v_schedule_exists;
  
  RETURN v_schedule_exists;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 3. FUNCTION: Generate available slots for a professional
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_slots(
  p_professional_id uuid,
  p_date date,
  p_service_duration_minutes integer,
  p_slot_duration_minutes integer DEFAULT 15
)
RETURNS TABLE(slot_time time) AS $$
DECLARE
  v_day_of_week integer;
  v_start_time time;
  v_end_time time;
  v_exception_start time;
  v_exception_end time;
  v_current_slot time;
BEGIN
  -- Get day of week
  v_day_of_week := EXTRACT(ISODOW FROM p_date) - 1;
  
  -- Get schedule times (regular schedule)
  SELECT start_time, end_time
  INTO v_start_time, v_end_time
  FROM schedules
  WHERE 
    professional_id = p_professional_id
    AND day_of_week = v_day_of_week
    AND is_active = true
  LIMIT 1;
  
  -- If no schedule, return empty
  IF v_start_time IS NULL THEN
    RETURN;
  END IF;
  
  -- Override with exception times if exception exists
  SELECT start_time, end_time
  INTO v_exception_start, v_exception_end
  FROM schedule_exceptions
  WHERE 
    professional_id = p_professional_id
    AND date = p_date
    AND is_available = true
  LIMIT 1;
  
  IF v_exception_start IS NOT NULL THEN
    v_start_time := v_exception_start;
    v_end_time := v_exception_end;
  END IF;
  
  -- Generate slots
  v_current_slot := v_start_time;
  
  LOOP
    EXIT WHEN v_current_slot + (p_service_duration_minutes || ' minutes')::interval > v_end_time;
    
    -- Check if slot is available (no conflicts)
    IF is_slot_available(
      p_professional_id,
      p_date,
      v_current_slot,
      v_current_slot + (p_service_duration_minutes || ' minutes')::interval
    ) THEN
      slot_time := v_current_slot;
      RETURN NEXT;
    END IF;
    
    v_current_slot := v_current_slot + (p_slot_duration_minutes || ' minutes')::interval;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. FUNCTION: Safe appointment creation with all checks
-- ============================================================================

CREATE OR REPLACE FUNCTION create_appointment_safe(
  p_patient_id uuid,
  p_professional_id uuid,
  p_service_type_id uuid,
  p_appointment_date date,
  p_start_time time,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  appointment_id uuid,
  error_message text
) AS $$
DECLARE
  v_service_duration integer;
  v_end_time time;
  v_appointment_id uuid;
  v_error text;
BEGIN
  -- Get service duration
  SELECT duration_minutes INTO v_service_duration
  FROM service_types
  WHERE id = p_service_type_id;
  
  IF v_service_duration IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Service type not found'::text;
    RETURN;
  END IF;
  
  -- Calculate end time
  v_end_time := p_start_time + (v_service_duration || ' minutes')::interval;
  
  -- Validate end time doesn't go past midnight
  IF v_end_time >= '24:00'::time THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Appointment extends past midnight'::text;
    RETURN;
  END IF;
  
  -- Check professional is available
  IF NOT is_professional_available(p_professional_id, p_appointment_date, p_start_time) THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Professional is not available at this time'::text;
    RETURN;
  END IF;
  
  -- Check slot is available (no conflicts)
  IF NOT is_slot_available(p_professional_id, p_appointment_date, p_start_time, v_end_time) THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Time slot is already booked'::text;
    RETURN;
  END IF;
  
  -- All checks passed, create appointment
  BEGIN
    INSERT INTO appointments (
      patient_id,
      professional_id,
      service_type_id,
      appointment_date,
      start_time,
      end_time,
      notes,
      status,
      created_by
    ) VALUES (
      p_patient_id,
      p_professional_id,
      p_service_type_id,
      p_appointment_date,
      p_start_time,
      v_end_time,
      p_notes,
      'scheduled'::appointment_status,
      p_patient_id
    )
    RETURNING id INTO v_appointment_id;
    
    RETURN QUERY SELECT true, v_appointment_id, NULL::text;
    
  EXCEPTION WHEN OTHERS THEN
    v_error := SQLERRM;
    RETURN QUERY SELECT false, NULL::uuid, v_error;
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. FUNCTION: Cancel appointment with cascading updates
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_appointment(
  p_appointment_id uuid,
  p_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  message text
) AS $$
DECLARE
  v_appointment_exists boolean;
  v_is_owner boolean;
  v_old_status text;
BEGIN
  -- Check appointment exists
  SELECT EXISTS(
    SELECT 1 FROM appointments WHERE id = p_appointment_id
  ) INTO v_appointment_exists;
  
  IF NOT v_appointment_exists THEN
    RETURN QUERY SELECT false, 'Appointment not found'::text;
    RETURN;
  END IF;
  
  -- Check user owns appointment
  SELECT EXISTS(
    SELECT 1 FROM appointments 
    WHERE id = p_appointment_id AND patient_id = p_user_id
  ) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    RETURN QUERY SELECT false, 'Unauthorized: not your appointment'::text;
    RETURN;
  END IF;
  
  -- Get current status
  SELECT status INTO v_old_status
  FROM appointments
  WHERE id = p_appointment_id;
  
  -- Only allow cancelling if not already completed
  IF v_old_status IN ('completed', 'cancelled', 'no_show') THEN
    RETURN QUERY SELECT false, 'Cannot cancel appointment in ' || v_old_status || ' status'::text;
    RETURN;
  END IF;
  
  -- Update appointment
  UPDATE appointments
  SET 
    status = 'cancelled'::appointment_status,
    notes = COALESCE(notes || E'\n' || 'Cancelled: ' || p_reason, 'Cancelled: ' || p_reason)
  WHERE id = p_appointment_id;
  
  -- Insert notification for cancellation
  INSERT INTO notifications (
    user_id,
    type,
    channel,
    subject,
    message,
    appointment_id,
    status
  ) VALUES (
    p_user_id,
    'appointment_cancelled'::notification_type,
    'email'::notification_channel,
    'Appointment Cancelled',
    'Your appointment has been cancelled. Reason: ' || COALESCE(p_reason, 'User requested'),
    p_appointment_id,
    'pending'::notification_status
  );
  
  RETURN QUERY SELECT true, 'Appointment cancelled successfully'::text;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. FUNCTION: Queue operations with validation
-- ============================================================================

CREATE OR REPLACE FUNCTION process_queue_ticket(
  p_ticket_id uuid,
  p_action text, -- 'call', 'complete', 'no_show', 'transfer'
  p_room_id uuid DEFAULT NULL,
  p_professional_id uuid DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  message text,
  ticket_code text
) AS $$
DECLARE
  v_ticket_exists boolean;
  v_current_status text;
  v_ticket_code text;
BEGIN
  -- Check ticket exists
  SELECT EXISTS(
    SELECT 1 FROM queue_tickets WHERE id = p_ticket_id
  ),
  ticket_code INTO v_ticket_exists, v_ticket_code
  FROM queue_tickets WHERE id = p_ticket_id;
  
  IF NOT v_ticket_exists THEN
    RETURN QUERY SELECT false, 'Ticket not found'::text, NULL::text;
    RETURN;
  END IF;
  
  -- Get current status
  SELECT status INTO v_current_status
  FROM queue_tickets WHERE id = p_ticket_id;
  
  -- Validate action against current status
  CASE p_action
    WHEN 'call' THEN
      IF v_current_status != 'waiting' THEN
        RETURN QUERY SELECT false, 'Can only call waiting tickets, current status: ' || v_current_status, v_ticket_code;
        RETURN;
      END IF;
      
      UPDATE queue_tickets
      SET status = 'called'::queue_status, called_at = now(), room_id = p_room_id
      WHERE id = p_ticket_id;
      
    WHEN 'complete' THEN
      IF v_current_status NOT IN ('called', 'waiting') THEN
        RETURN QUERY SELECT false, 'Can only complete called or waiting tickets', v_ticket_code;
        RETURN;
      END IF;
      
      UPDATE queue_tickets
      SET status = 'completed'::queue_status, completed_at = now()
      WHERE id = p_ticket_id;
      
    WHEN 'no_show' THEN
      IF v_current_status != 'called' THEN
        RETURN QUERY SELECT false, 'Can only mark called tickets as no-show', v_ticket_code;
        RETURN;
      END IF;
      
      UPDATE queue_tickets
      SET status = 'no_show'::queue_status, no_show_at = now()
      WHERE id = p_ticket_id;
      
    WHEN 'transfer' THEN
      IF v_current_status != 'waiting' THEN
        RETURN QUERY SELECT false, 'Can only transfer waiting tickets', v_ticket_code;
        RETURN;
      END IF;
      
      IF p_professional_id IS NULL THEN
        RETURN QUERY SELECT false, 'Professional ID required for transfer', v_ticket_code;
        RETURN;
      END IF;
      
      UPDATE queue_tickets
      SET professional_id = p_professional_id
      WHERE id = p_ticket_id;
      
    ELSE
      RETURN QUERY SELECT false, 'Unknown action: ' || p_action, v_ticket_code;
      RETURN;
  END CASE;
  
  RETURN QUERY SELECT true, 'Ticket ' || p_action || 'ed successfully'::text, v_ticket_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FUNCTION: Notification idempotency check
-- ============================================================================

CREATE OR REPLACE FUNCTION log_notification_delivery(
  p_notification_id uuid,
  p_idempotency_key text,
  p_response_payload jsonb
)
RETURNS TABLE(
  success boolean,
  message text,
  is_duplicate boolean
) AS $$
DECLARE
  v_already_processed boolean;
BEGIN
  -- Check if this idempotency key was already processed
  SELECT EXISTS(
    SELECT 1 FROM notification_idempotency 
    WHERE idempotency_key = p_idempotency_key
  ) INTO v_already_processed;
  
  IF v_already_processed THEN
    RETURN QUERY SELECT true, 'Notification already processed (duplicate)'::text, true;
    RETURN;
  END IF;
  
  -- Log this delivery
  INSERT INTO notification_idempotency (
    notification_id,
    idempotency_key,
    response_payload
  ) VALUES (
    p_notification_id,
    p_idempotency_key,
    p_response_payload
  );
  
  -- Update notification status
  UPDATE notifications
  SET status = 'sent'::notification_status, delivered_at = now()
  WHERE id = p_notification_id;
  
  RETURN QUERY SELECT true, 'Notification logged successfully'::text, false;
  
EXCEPTION WHEN unique_violation THEN
  RETURN QUERY SELECT false, 'Duplicate idempotency key detected'::text, true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. FUNCTION: Get queue position and wait estimate
-- ============================================================================

CREATE OR REPLACE FUNCTION get_queue_position(
  p_ticket_id uuid
)
RETURNS TABLE(
  position integer,
  estimated_wait_minutes integer,
  current_serving_code text
) AS $$
DECLARE
  v_service_type_id uuid;
  v_created_at timestamp;
BEGIN
  -- Get ticket info
  SELECT service_type_id, created_at
  INTO v_service_type_id, v_created_at
  FROM queue_tickets WHERE id = p_ticket_id;
  
  IF v_service_type_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get position (count of people ahead)
  SELECT 
    (SELECT COUNT(*) + 1 FROM queue_tickets qt2
     WHERE qt2.service_type_id = v_service_type_id
     AND qt2.status = 'waiting'
     AND qt2.created_at <= (SELECT created_at FROM queue_tickets WHERE id = p_ticket_id)
    )::integer,
    -- Estimate wait: 5 minutes per person ahead
    (SELECT COUNT(*) * 5 FROM queue_tickets qt2
     WHERE qt2.service_type_id = v_service_type_id
     AND qt2.status = 'waiting'
     AND qt2.created_at < v_created_at
    )::integer,
    -- Current serving ticket code
    (SELECT ticket_code FROM queue_tickets
     WHERE service_type_id = v_service_type_id
     AND status = 'called'
     ORDER BY called_at DESC LIMIT 1
    )::text
  INTO position, estimated_wait_minutes, current_serving_code;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. FUNCTION: Cleanup old data (archive)
-- ============================================================================

CREATE OR REPLACE FUNCTION archive_old_notifications(
  p_days_old integer DEFAULT 30
)
RETURNS TABLE(
  archived_count integer,
  message text
) AS $$
DECLARE
  v_count integer;
BEGIN
  -- Delete old sent/failed notifications that are > p_days_old days old
  DELETE FROM notifications
  WHERE 
    status IN ('sent', 'failed')
    AND created_at < now() - (p_days_old || ' days')::interval;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_count, 'Archived ' || v_count || ' old notifications'::text;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. FUNCTION: Verify data integrity
-- ============================================================================

CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
  check_name text,
  status text,
  issue_count integer,
  description text
) AS $$
BEGIN
  -- Check 1: Appointments with invalid times
  RETURN QUERY
  SELECT 
    'Invalid appointment times'::text,
    CASE WHEN COUNT(*) > 0 THEN 'FAIL' ELSE 'PASS' END,
    COUNT(*)::integer,
    'Appointments where start_time >= end_time'::text
  FROM appointments WHERE start_time >= end_time;
  
  -- Check 2: Appointments outside schedule
  RETURN QUERY
  SELECT 
    'Appointments outside professional schedule'::text,
    'INFO'::text,
    COUNT(*)::integer,
    'Appointments that may violate schedule'::text
  FROM appointments a
  WHERE NOT is_professional_available(a.professional_id, a.appointment_date, a.start_time);
  
  -- Check 3: Queue tickets with no status
  RETURN QUERY
  SELECT 
    'Queue tickets with null status'::text,
    CASE WHEN COUNT(*) > 0 THEN 'FAIL' ELSE 'PASS' END,
    COUNT(*)::integer,
    'Tickets missing required status field'::text
  FROM queue_tickets WHERE status IS NULL;
  
  -- Check 4: Notifications missing delivery info
  RETURN QUERY
  SELECT 
    'Sent notifications without delivery time'::text,
    CASE WHEN COUNT(*) > 0 THEN 'WARN' ELSE 'PASS' END,
    COUNT(*)::integer,
    'Notifications marked sent but no delivered_at timestamp'::text
  FROM notifications WHERE status = 'sent' AND delivered_at IS NULL;
  
  -- Check 5: Orphaned appointments (professional deleted)
  RETURN QUERY
  SELECT 
    'Orphaned appointments'::text,
    CASE WHEN COUNT(*) > 0 THEN 'WARN' ELSE 'PASS' END,
    COUNT(*)::integer,
    'Appointments with non-existent professional_id'::text
  FROM appointments a
  WHERE NOT EXISTS(SELECT 1 FROM professionals p WHERE p.id = a.professional_id);
  
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS (execute these functions as the appropriate user)
-- ============================================================================

-- Allow authenticated users to call public functions
GRANT EXECUTE ON FUNCTION is_slot_available TO authenticated;
GRANT EXECUTE ON FUNCTION is_professional_available TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_slots TO authenticated;
GRANT EXECUTE ON FUNCTION create_appointment_safe TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_appointment TO authenticated;
GRANT EXECUTE ON FUNCTION process_queue_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION get_queue_position TO authenticated;
GRANT EXECUTE ON FUNCTION check_data_integrity TO authenticated;

-- Admin functions
GRANT EXECUTE ON FUNCTION archive_old_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION log_notification_delivery TO authenticated;

-- ============================================================================
-- EXECUTION NOTES
-- ============================================================================
/*
TESTING THE FUNCTIONS:

1. Test slot availability:
   SELECT * FROM is_slot_available(
     'prof-uuid-here',
     '2024-02-20'::date,
     '14:00'::time,
     '14:30'::time
   );

2. Test get available slots:
   SELECT * FROM get_available_slots(
     'prof-uuid-here',
     '2024-02-20'::date,
     30 -- service duration in minutes
   );

3. Test safe appointment creation:
   SELECT * FROM create_appointment_safe(
     'patient-uuid',
     'prof-uuid',
     'service-uuid',
     '2024-02-20'::date,
     '14:00'::time
   );

4. Test queue operations:
   SELECT * FROM process_queue_ticket(
     'ticket-uuid',
     'call',
     'room-uuid'
   );

5. Check data integrity:
   SELECT * FROM check_data_integrity();

6. View queue position:
   SELECT * FROM get_queue_position('ticket-uuid');
*/

COMMIT;
