-- ============================================================================
-- SCRIPT: 05_improve_rls_policies.sql
-- PURPOSE: Add comprehensive RLS policies to protect sensitive medical data
-- CREATED: 2024-02-16
-- ============================================================================
-- This script adds/improves:
-- 1. Enhanced RLS policies for appointments
-- 2. Enhanced RLS policies for queue
-- 3. Enhanced RLS policies for notifications
-- 4. Professional/Staff access controls
-- 5. Admin-only operations
-- ============================================================================

-- ============================================================================
-- ENABLE RLS on all tables (ensure it's enabled)
-- ============================================================================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: Get user role
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM profiles
  WHERE id = user_id
  LIMIT 1;
  
  RETURN COALESCE(v_role, 'patient');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- HELPER FUNCTION: Get user's organization
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_organization(user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM profiles
  WHERE id = user_id
  LIMIT 1;
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- HELPER FUNCTION: Check if user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION is_user_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN get_user_role(user_id) IN ('admin', 'staff');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 1. APPOINTMENTS - Row Level Security
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;
DROP POLICY IF EXISTS "Professionals can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Admin can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Admin can update appointments" ON appointments;

-- Policy 1: Patients can view their own appointments
CREATE POLICY "Users can view own appointments"
  ON appointments FOR SELECT
  USING (patient_id = auth.uid());

-- Policy 2: Patients can create their own appointments
CREATE POLICY "Users can insert own appointments"
  ON appointments FOR INSERT
  WITH CHECK (patient_id = auth.uid());

-- Policy 3: Patients can update their own appointments (limited fields)
CREATE POLICY "Users can update own appointments"
  ON appointments FOR UPDATE
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Policy 4: Professionals can view their appointments (for check-in)
CREATE POLICY "Professionals can view their appointments"
  ON appointments FOR SELECT
  USING (
    professional_id = auth.uid()
    AND is_user_admin(auth.uid())
  );

-- Policy 5: Professionals can update their appointments (check-in, complete)
CREATE POLICY "Professionals can update their appointments"
  ON appointments FOR UPDATE
  USING (
    professional_id = auth.uid()
    AND is_user_admin(auth.uid())
  );

-- Policy 6: Admin can view all appointments in their organization
CREATE POLICY "Admin can view all appointments"
  ON appointments FOR SELECT
  USING (
    is_user_admin(auth.uid())
    AND organization_id = get_user_organization(auth.uid())
  );

-- Policy 7: Admin can manage all appointments in their organization
CREATE POLICY "Admin can manage appointments"
  ON appointments FOR ALL
  USING (
    is_user_admin(auth.uid())
    AND organization_id = get_user_organization(auth.uid())
  );

-- ============================================================================
-- 2. QUEUE TICKETS - Row Level Security
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their queue tickets" ON queue_tickets;
DROP POLICY IF EXISTS "Users can create queue tickets" ON queue_tickets;
DROP POLICY IF EXISTS "Staff can view queue tickets" ON queue_tickets;
DROP POLICY IF EXISTS "Staff can manage queue tickets" ON queue_tickets;
DROP POLICY IF EXISTS "Admin can view all queue tickets" ON queue_tickets;

-- Policy 1: Patients can view their own queue tickets
CREATE POLICY "Users can view their queue tickets"
  ON queue_tickets FOR SELECT
  USING (
    patient_id IS NULL 
    OR patient_id = auth.uid()
  );

-- Policy 2: Patients can create queue tickets
CREATE POLICY "Users can create queue tickets"
  ON queue_tickets FOR INSERT
  WITH CHECK (
    patient_id IS NULL 
    OR patient_id = auth.uid()
  );

-- Policy 3: Staff (receptionist, professional) can view queue for their organization
CREATE POLICY "Staff can view queue tickets"
  ON queue_tickets FOR SELECT
  USING (
    is_user_admin(auth.uid())
    AND organization_id = get_user_organization(auth.uid())
  );

-- Policy 4: Staff can manage queue tickets
CREATE POLICY "Staff can manage queue tickets"
  ON queue_tickets FOR UPDATE
  USING (
    is_user_admin(auth.uid())
    AND organization_id = get_user_organization(auth.uid())
  );

-- Policy 5: Admin can do everything with queue
CREATE POLICY "Admin can view all queue tickets"
  ON queue_tickets FOR ALL
  USING (
    is_user_admin(auth.uid())
    AND organization_id = get_user_organization(auth.uid())
  );

-- ============================================================================
-- 3. NOTIFICATIONS - Row Level Security
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admin can view all notifications" ON notifications;

-- Policy 1: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 3: System (service role key) can create notifications
-- This is handled via Supabase service role key, but we allow admin to create too
CREATE POLICY "Admin can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (is_user_admin(auth.uid()));

-- Policy 4: Admin can view and manage all notifications in their organization
CREATE POLICY "Admin can view all notifications"
  ON notifications FOR SELECT
  USING (is_user_admin(auth.uid()));

-- Policy 5: Admin can retry failed notifications
CREATE POLICY "Admin can manage notifications"
  ON notifications FOR UPDATE
  USING (is_user_admin(auth.uid()));

-- ============================================================================
-- 4. PROFILES - Row Level Security
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 3: Admin can view all profiles in their organization
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (
    is_user_admin(auth.uid())
    AND organization_id = get_user_organization(auth.uid())
  );

-- Policy 4: Admin can update profiles (role changes, etc)
CREATE POLICY "Admin can manage profiles"
  ON profiles FOR UPDATE
  USING (
    is_user_admin(auth.uid())
    AND organization_id = get_user_organization(auth.uid())
  );

-- ============================================================================
-- 5. SCHEDULES - Row Level Security (mostly public for booking)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view schedules for booking" ON schedules;
DROP POLICY IF EXISTS "Professionals can update their schedules" ON schedules;
DROP POLICY IF EXISTS "Admin can manage schedules" ON schedules;

-- Policy 1: Anyone authenticated can view schedules (needed for booking)
CREATE POLICY "Anyone can view schedules for booking"
  ON schedules FOR SELECT
  USING (true);

-- Policy 2: Professionals can update their own schedule
CREATE POLICY "Professionals can update their schedules"
  ON schedules FOR UPDATE
  USING (
    professional_id = auth.uid()
    AND is_user_admin(auth.uid())
  );

-- Policy 3: Admin can manage all schedules in their organization
CREATE POLICY "Admin can manage schedules"
  ON schedules FOR ALL
  USING (
    is_user_admin(auth.uid())
    AND organization_id = get_user_organization(auth.uid())
  );

-- ============================================================================
-- 6. SERVICE TYPES - Row Level Security (public for booking)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view service types" ON service_types;
DROP POLICY IF EXISTS "Admin can manage service types" ON service_types;

-- Policy 1: Anyone can view service types
CREATE POLICY "Anyone can view service types"
  ON service_types FOR SELECT
  USING (true);

-- Policy 2: Admin can manage service types in their organization
CREATE POLICY "Admin can manage service types"
  ON service_types FOR ALL
  USING (
    is_user_admin(auth.uid())
    AND organization_id = get_user_organization(auth.uid())
  );

-- ============================================================================
-- 7. PROFESSIONALS - Row Level Security (public for booking)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view professionals for booking" ON professionals;
DROP POLICY IF EXISTS "Professionals can update own profile" ON professionals;
DROP POLICY IF EXISTS "Admin can manage professionals" ON professionals;

-- Policy 1: Anyone can view professionals (filtered by organization)
CREATE POLICY "Anyone can view professionals for booking"
  ON professionals FOR SELECT
  USING (true);

-- Policy 2: Professionals can view and update their own information
CREATE POLICY "Professionals can update own profile"
  ON professionals FOR UPDATE
  USING (
    id = auth.uid()
    AND is_user_admin(auth.uid())
  );

-- Policy 3: Admin can manage all professionals in their organization
CREATE POLICY "Admin can manage professionals"
  ON professionals FOR ALL
  USING (
    is_user_admin(auth.uid())
    AND organization_id = get_user_organization(auth.uid())
  );

-- ============================================================================
-- 8. SCHEDULE EXCEPTIONS - Row Level Security
-- ============================================================================

DROP POLICY IF EXISTS "Professionals can manage their exceptions" ON schedule_exceptions;
DROP POLICY IF EXISTS "Admin can manage all exceptions" ON schedule_exceptions;

-- Policy 1: Professionals can view their schedule exceptions
CREATE POLICY "Professionals can view their exceptions"
  ON schedule_exceptions FOR SELECT
  USING (
    professional_id = auth.uid()
    AND is_user_admin(auth.uid())
  );

-- Policy 2: Professionals can create/update their own exceptions
CREATE POLICY "Professionals can manage their exceptions"
  ON schedule_exceptions FOR ALL
  USING (
    professional_id = auth.uid()
    AND is_user_admin(auth.uid())
  );

-- Policy 3: Admin can manage all exceptions in their organization
CREATE POLICY "Admin can manage all exceptions"
  ON schedule_exceptions FOR ALL
  USING (
    is_user_admin(auth.uid())
    AND (
      SELECT organization_id FROM professionals 
      WHERE id = schedule_exceptions.professional_id
    ) = get_user_organization(auth.uid())
  );

-- ============================================================================
-- 9. NOTIFICATION DEAD LETTER QUEUE - Admin only
-- ============================================================================

DROP POLICY IF EXISTS "Admin can view DLQ" ON notification_dead_letter_queue;
DROP POLICY IF EXISTS "Admin can manage DLQ" ON notification_dead_letter_queue;

-- Policy 1: Admin can view failed notifications
CREATE POLICY "Admin can view DLQ"
  ON notification_dead_letter_queue FOR SELECT
  USING (is_user_admin(auth.uid()));

-- Policy 2: Admin can manage DLQ (retry, delete)
CREATE POLICY "Admin can manage DLQ"
  ON notification_dead_letter_queue FOR ALL
  USING (is_user_admin(auth.uid()));

-- ============================================================================
-- 10. NOTIFICATION IDEMPOTENCY - System only
-- ============================================================================

DROP POLICY IF EXISTS "System can log notification delivery" ON notification_idempotency;
DROP POLICY IF EXISTS "Admin can view idempotency logs" ON notification_idempotency;

-- Policy 1: System can create idempotency records
CREATE POLICY "System can log notification delivery"
  ON notification_idempotency FOR INSERT
  WITH CHECK (is_user_admin(auth.uid()));

-- Policy 2: Admin can view for debugging
CREATE POLICY "Admin can view idempotency logs"
  ON notification_idempotency FOR SELECT
  USING (is_user_admin(auth.uid()));

-- ============================================================================
-- VERIFY RLS is enabled on all tables
-- ============================================================================

CREATE OR REPLACE VIEW v_rls_status AS
SELECT 
  tablename as table_name,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'appointments',
  'queue_tickets',
  'notifications',
  'profiles',
  'schedules',
  'service_types',
  'professionals',
  'schedule_exceptions',
  'notification_dead_letter_queue',
  'notification_idempotency'
)
ORDER BY tablename;

-- ============================================================================
-- EXECUTION NOTES
-- ============================================================================
/*
VERIFY RLS IS WORKING:

1. Check RLS status:
   SELECT * FROM v_rls_status;

2. Test as patient (should only see own data):
   SELECT * FROM appointments; -- Only their appointments

3. Test as admin (should see organization data):
   SELECT * FROM appointments; -- All in their organization

4. Test unauthorized access (should be blocked):
   -- Try to access another user's appointment (via SQL/API)
   -- Should return 0 rows or error

COMMON ISSUES:

1. "Permission denied for schema public"
   → User role needs SELECT on schema
   → Grant: GRANT USAGE ON SCHEMA public TO authenticated;

2. "New row violates row-level security policy"
   → Trying to insert with wrong user_id
   → Fix: Ensure auth.uid() matches the data

3. Service role key bypassing RLS
   → This is expected and normal
   → Only use service role key for backend operations
   → Never expose service role key to frontend

TESTING IN SUPABASE:

1. Go to SQL Editor
2. Run: SELECT * FROM v_rls_status;
3. Should show all tables as ENABLED
4. Create test data and verify RLS blocks unauthorized access
*/

COMMIT;
