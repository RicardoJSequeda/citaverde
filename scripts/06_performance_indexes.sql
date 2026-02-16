-- ============================================================================
-- SCRIPT: 06_performance_indexes.sql
-- PURPOSE: Add strategic indexes to optimize query performance
-- CREATED: 2024-02-16
-- ============================================================================
-- This script creates indexes for:
-- 1. Appointment availability queries
-- 2. Queue management queries
-- 3. Notification delivery queries
-- 4. User lookup queries
-- 5. Calendar/schedule queries
-- ============================================================================

-- ============================================================================
-- 1. APPOINTMENT PERFORMANCE INDEXES
-- ============================================================================

-- Index for checking appointment availability (most critical query)
CREATE INDEX IF NOT EXISTS idx_appointments_availability_check ON appointments (
  professional_id,
  appointment_date,
  start_time,
  end_time,
  status
) WHERE status IN ('scheduled', 'confirmed', 'checked_in', 'in_progress');

-- Composite index for filtering by patient
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments (
  patient_id,
  appointment_date DESC,
  status
);

-- Index for finding appointments by date range
CREATE INDEX IF NOT EXISTS idx_appointments_date_range ON appointments (
  appointment_date,
  professional_id,
  status
) WHERE status IN ('scheduled', 'confirmed', 'checked_in', 'in_progress');

-- Index for finding appointments by professional
CREATE INDEX IF NOT EXISTS idx_appointments_professional_status ON appointments (
  professional_id,
  status,
  appointment_date DESC
);

-- Index for notification creation (when appointment is created)
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments (
  created_at DESC
) WHERE status = 'scheduled';

-- ============================================================================
-- 2. QUEUE TICKET PERFORMANCE INDEXES
-- ============================================================================

-- Index for active queue operations (most important)
CREATE INDEX IF NOT EXISTS idx_queue_tickets_active ON queue_tickets (
  service_type_id,
  status,
  created_at
) WHERE status IN ('waiting', 'called');

-- Index for patient's queue history
CREATE INDEX IF NOT EXISTS idx_queue_tickets_patient ON queue_tickets (
  patient_id,
  created_at DESC
) WHERE patient_id IS NOT NULL;

-- Index for finding current serving ticket
CREATE INDEX IF NOT EXISTS idx_queue_tickets_called_current ON queue_tickets (
  service_type_id,
  called_at DESC
) WHERE status = 'called';

-- Index for queue position calculation
CREATE INDEX IF NOT EXISTS idx_queue_tickets_waiting_order ON queue_tickets (
  service_type_id,
  created_at
) WHERE status = 'waiting';

-- ============================================================================
-- 3. NOTIFICATION PERFORMANCE INDEXES
-- ============================================================================

-- Index for finding pending notifications (most critical)
CREATE INDEX IF NOT EXISTS idx_notifications_pending_fast ON notifications (
  status,
  created_at,
  type
) WHERE status = 'pending';

-- Index for notification delivery tracking
CREATE INDEX IF NOT EXISTS idx_notifications_delivery_tracking ON notifications (
  status,
  delivered_at DESC
) WHERE status IN ('sent', 'failed');

-- Index for user notification history
CREATE INDEX IF NOT EXISTS idx_notifications_user_history ON notifications (
  user_id,
  created_at DESC
);

-- Index for appointment notification lookup
CREATE INDEX IF NOT EXISTS idx_notifications_appointment ON notifications (
  appointment_id,
  type
) WHERE appointment_id IS NOT NULL;

-- Index for queue notification lookup
CREATE INDEX IF NOT EXISTS idx_notifications_queue_ticket ON notifications (
  queue_ticket_id,
  type
) WHERE queue_ticket_id IS NOT NULL;

-- Index for DLQ queries
CREATE INDEX IF NOT EXISTS idx_notifications_dlq_status ON notification_dead_letter_queue (
  status,
  created_at DESC
) WHERE status = 'failed';

-- ============================================================================
-- 4. SCHEDULE AND AVAILABILITY INDEXES
-- ============================================================================

-- Index for professional's schedule lookup
CREATE INDEX IF NOT EXISTS idx_schedules_professional_lookup ON schedules (
  professional_id,
  day_of_week,
  is_active
);

-- Index for schedule exceptions lookup
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_lookup ON schedule_exceptions (
  professional_id,
  date,
  is_available
);

-- Index for checking day-specific schedule
CREATE INDEX IF NOT EXISTS idx_schedules_by_day ON schedules (
  professional_id,
  day_of_week
) WHERE is_active = true;

-- ============================================================================
-- 5. PROFILE AND USER INDEXES
-- ============================================================================

-- Index for role-based access control
CREATE INDEX IF NOT EXISTS idx_profiles_role_org ON profiles (
  role,
  organization_id
) WHERE role IN ('admin', 'staff', 'professional');

-- Index for finding staff members
CREATE INDEX IF NOT EXISTS idx_profiles_staff ON profiles (
  organization_id,
  role
) WHERE role IN ('admin', 'receptionist', 'professional');

-- Index for professional lookup by organization
CREATE INDEX IF NOT EXISTS idx_professionals_organization_active ON professionals (
  organization_id,
  is_active
) WHERE is_active = true;

-- Index for professional filtering by specialty
CREATE INDEX IF NOT EXISTS idx_professionals_specialty ON professionals (
  organization_id,
  specialty,
  is_active
) WHERE is_active = true;

-- ============================================================================
-- 6. TEXT SEARCH INDEXES (for future search features)
-- ============================================================================

-- GIN index for full-text search on professional names
CREATE INDEX IF NOT EXISTS idx_professionals_name_search ON professionals
USING gin(
  to_tsvector('spanish', name || ' ' || COALESCE(specialty, ''))
);

-- GIN index for profile search
CREATE INDEX IF NOT EXISTS idx_profiles_name_search ON profiles
USING gin(
  to_tsvector('spanish', full_name || ' ' || COALESCE(phone, ''))
);

-- ============================================================================
-- 7. FOREIGN KEY INDEXES (to speed up joins)
-- ============================================================================

-- Index for appointments -> patient joins
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);

-- Index for appointments -> professional joins
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON appointments(professional_id);

-- Index for appointments -> service type joins
CREATE INDEX IF NOT EXISTS idx_appointments_service_type_id ON appointments(service_type_id);

-- Index for queue tickets -> patient joins
CREATE INDEX IF NOT EXISTS idx_queue_tickets_patient_id ON queue_tickets(patient_id);

-- Index for queue tickets -> service type joins
CREATE INDEX IF NOT EXISTS idx_queue_tickets_service_type_id ON queue_tickets(service_type_id);

-- ============================================================================
-- 8. BOOLEAN FLAG INDEXES (for filtering)
-- ============================================================================

-- Index for active/inactive filtering
CREATE INDEX IF NOT EXISTS idx_professionals_active ON professionals(is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_schedules_active ON schedules(is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_service_types_active ON service_types(is_active)
WHERE is_active = true;

-- ============================================================================
-- 9. PARTIAL INDEXES for common filters
-- ============================================================================

-- Only index recent appointments (most queries are for upcoming)
CREATE INDEX IF NOT EXISTS idx_appointments_upcoming ON appointments (
  appointment_date,
  start_time
) WHERE status IN ('scheduled', 'confirmed') AND appointment_date >= CURRENT_DATE;

-- Only index recent notifications (old ones archived)
CREATE INDEX IF NOT EXISTS idx_notifications_recent ON notifications (
  created_at DESC
) WHERE created_at > CURRENT_DATE - INTERVAL '90 days';

-- Only index unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (
  user_id,
  created_at DESC
) WHERE status = 'pending';

-- ============================================================================
-- 10. COMPOSITE INDEXES for common query patterns
-- ============================================================================

-- Index for "get appointments by patient and date range"
CREATE INDEX IF NOT EXISTS idx_appointments_patient_range ON appointments (
  patient_id,
  appointment_date DESC,
  status,
  start_time
);

-- Index for "get queue tickets by service and status"
CREATE INDEX IF NOT EXISTS idx_queue_service_status_created ON queue_tickets (
  service_type_id,
  status,
  created_at
);

-- Index for "get notifications to send"
CREATE INDEX IF NOT EXISTS idx_notifications_to_send ON notifications (
  status,
  type,
  created_at
) WHERE status IN ('pending', 'failed');

-- ============================================================================
-- 11. COVERING INDEXES (include all columns needed for query)
-- ============================================================================

-- Covering index for appointment availability check
CREATE INDEX IF NOT EXISTS idx_appointments_availability_covering ON appointments (
  professional_id,
  appointment_date,
  status
) INCLUDE (start_time, end_time)
WHERE status IN ('scheduled', 'confirmed', 'checked_in', 'in_progress');

-- Covering index for patient appointment list
CREATE INDEX IF NOT EXISTS idx_appointments_patient_list ON appointments (
  patient_id,
  appointment_date DESC
) INCLUDE (status, start_time, professional_id);

-- ============================================================================
-- ANALYZE INDEX USAGE (after creating indexes)
-- ============================================================================

-- This view shows which indexes are being used
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  ROUND(100 * idx_tup_fetch / NULLIF(idx_tup_read, 0), 2) as efficiency_pct
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ============================================================================
-- VALIDATE ALL INDEXES
-- ============================================================================

-- Check for missing indexes on foreign keys
CREATE OR REPLACE VIEW v_missing_fk_indexes AS
SELECT 
  c.table_name,
  u.column_name,
  'MISSING INDEX' as issue
FROM 
  information_schema.table_constraints tc
  JOIN information_schema.key_column_usage u ON tc.constraint_name = u.constraint_name
  JOIN information_schema.constraint_column_usage c ON tc.constraint_name = c.constraint_name
WHERE 
  tc.constraint_type = 'FOREIGN KEY'
  AND NOT EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = u.table_name 
    AND indexdef LIKE '%' || u.column_name || '%'
  )
ORDER BY c.table_name;

-- ============================================================================
-- EXECUTION NOTES
-- ============================================================================
/*
AFTER RUNNING THIS SCRIPT:

1. Verify all indexes were created:
   SELECT * FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;

2. Check index usage (after running queries):
   SELECT * FROM v_index_usage;

3. Check for missing FK indexes:
   SELECT * FROM v_missing_fk_indexes;

4. Monitor index size:
   SELECT 
     indexname, 
     pg_size_pretty(pg_relation_size(indexrelid)) as size
   FROM pg_stat_user_indexes
   ORDER BY pg_relation_size(indexrelid) DESC;

5. Vacuum and analyze to update statistics:
   VACUUM ANALYZE;

PERFORMANCE EXPECTATIONS:

Before: Appointment availability check ~1-2 seconds (large dataset)
After: ~50-100ms (with index)

Before: Queue position calculation ~500ms
After: ~20-50ms (with index)

Before: Notification processing lookup ~300ms
After: ~5-10ms (with index)

MONITORING:

1. Check slow queries (queries > 1s):
   - Enable slow query log in Supabase
   - Look for queries not using indexes
   - Run ANALYZE on those queries

2. Index bloat (indexes growing too large):
   - Run VACUUM ANALYZE monthly
   - Consider REINDEX if bloat detected
   - Monitor via pg_statio_user_indexes

3. Unused indexes:
   - Periodically check v_index_usage
   - Drop indexes with 0 scans (after 1 week)
   - Unused indexes just slow down writes

OPTIMIZATION TIPS:

1. If "get available slots" is still slow:
   - Pre-generate slots nightly and cache
   - Or use materialized view for slots

2. If "queue position" is slow:
   - Cache position in queue_tickets table
   - Update on CALL/COMPLETE events

3. If notifications are bottleneck:
   - Use BRIN indexes for time-series data
   - Archive old notifications monthly
*/

COMMIT;
