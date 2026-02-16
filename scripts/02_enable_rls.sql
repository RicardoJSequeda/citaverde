-- ==================== ENABLE RLS ON CORE TABLES ====================
-- Row Level Security must be enforced on ALL tables for data safety
-- This prevents users from accessing data they shouldn't

-- Enable RLS
ALTER TABLE IF EXISTS appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS queue_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organizations ENABLE ROW LEVEL SECURITY;

-- ==================== APPOINTMENTS TABLE POLICIES ====================

CREATE POLICY IF NOT EXISTS "appointments_users_can_see_own"
  ON appointments
  FOR SELECT
  USING (
    patient_id = auth.uid() OR
    professional_id IN (SELECT id FROM professionals WHERE id = auth.uid()) OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'receptionist')
  );

CREATE POLICY IF NOT EXISTS "appointments_users_can_insert"
  ON appointments
  FOR INSERT
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY IF NOT EXISTS "appointments_users_can_update_own"
  ON appointments
  FOR UPDATE
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- ==================== QUEUE_TICKETS TABLE POLICIES ====================

CREATE POLICY IF NOT EXISTS "queue_tickets_users_can_see_own"
  ON queue_tickets
  FOR SELECT
  USING (
    patient_id = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'receptionist')
  );

CREATE POLICY IF NOT EXISTS "queue_tickets_users_can_create"
  ON queue_tickets
  FOR INSERT
  WITH CHECK (
    patient_id = auth.uid() OR
    patient_id IS NULL -- Allow anonymous queue tickets
  );

CREATE POLICY IF NOT EXISTS "queue_tickets_staff_can_update"
  ON queue_tickets
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'receptionist')
  );

-- ==================== NOTIFICATIONS TABLE POLICIES ====================

CREATE POLICY IF NOT EXISTS "notifications_users_can_see_own"
  ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "notifications_admin_can_see_all"
  ON notifications
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==================== PROFILES TABLE POLICIES ====================

CREATE POLICY IF NOT EXISTS "profiles_users_can_see_own"
  ON profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY IF NOT EXISTS "profiles_users_can_update_own"
  ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY IF NOT EXISTS "profiles_admin_can_see_all"
  ON profiles
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==================== PROFESSIONALS TABLE POLICIES ====================

CREATE POLICY IF NOT EXISTS "professionals_anyone_can_view"
  ON professionals
  FOR SELECT
  USING (is_active = true);

CREATE POLICY IF NOT EXISTS "professionals_admin_can_manage"
  ON professionals
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==================== SERVICE_TYPES TABLE POLICIES ====================

CREATE POLICY IF NOT EXISTS "service_types_anyone_can_view"
  ON service_types
  FOR SELECT
  USING (is_active = true);

CREATE POLICY IF NOT EXISTS "service_types_admin_can_manage"
  ON service_types
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==================== DEPARTMENTS TABLE POLICIES ====================

CREATE POLICY IF NOT EXISTS "departments_anyone_can_view"
  ON departments
  FOR SELECT
  USING (is_active = true);

CREATE POLICY IF NOT EXISTS "departments_admin_can_manage"
  ON departments
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==================== ROOMS TABLE POLICIES ====================

CREATE POLICY IF NOT EXISTS "rooms_staff_can_view"
  ON rooms
  FOR SELECT
  USING (
    is_active = true OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'receptionist')
  );

CREATE POLICY IF NOT EXISTS "rooms_admin_can_manage"
  ON rooms
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==================== SCHEDULES TABLE POLICIES ====================

CREATE POLICY IF NOT EXISTS "schedules_anyone_can_view"
  ON schedules
  FOR SELECT
  USING (is_active = true);

CREATE POLICY IF NOT EXISTS "schedules_professional_can_manage_own"
  ON schedules
  FOR ALL
  USING (
    professional_id = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==================== ORGANIZATIONS TABLE POLICIES ====================

CREATE POLICY IF NOT EXISTS "organizations_users_in_org_can_view"
  ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==================== ENABLE RLS AUDIT ====================

-- Log RLS enabled timestamp
INSERT INTO audit_log (action, table_name, details)
VALUES (
  'RLS_ENABLED',
  'all_tables',
  jsonb_build_object(
    'timestamp', now(),
    'tables', array[
      'appointments',
      'queue_tickets',
      'notifications',
      'profiles',
      'professionals',
      'service_types',
      'departments',
      'rooms',
      'schedules',
      'organizations'
    ]
  )
) ON CONFLICT DO NOTHING;

-- ==================== VERIFICATION ====================

-- Run this query to verify RLS is enabled:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename IN (
--   'appointments', 'queue_tickets', 'notifications', 'profiles',
--   'professionals', 'service_types', 'departments', 'rooms', 'schedules'
-- );
