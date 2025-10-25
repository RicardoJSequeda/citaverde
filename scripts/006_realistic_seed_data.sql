-- ============================================
-- SEED DATA WITH REALISTIC INFORMATION
-- ============================================

-- Insert organization
INSERT INTO public.organizations (id, name, address, phone, email, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Hospital Central San José',
  'Av. Principal 123, Ciudad Capital',
  '+1-555-0100',
  'contacto@hospitalcentral.com',
  '{"check_in_window_minutes": 30, "default_sla_minutes": 15}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Insert departments
INSERT INTO public.departments (id, organization_id, name, description) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Medicina General', 'Consultas médicas generales y chequeos'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Pediatría', 'Atención especializada para niños y adolescentes'),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Cardiología', 'Diagnóstico y tratamiento de enfermedades del corazón'),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Laboratorio', 'Análisis clínicos y pruebas diagnósticas'),
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Radiología', 'Estudios de imagen y diagnóstico por imagen'),
('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Emergencias', 'Atención de urgencias médicas 24/7')
ON CONFLICT (id) DO NOTHING;

-- Insert service types
INSERT INTO public.service_types (id, organization_id, name, description, duration_minutes, color) VALUES
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Consulta General', 'Consulta médica general', 30, '#3b82f6'),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Consulta Pediátrica', 'Consulta especializada en pediatría', 30, '#ec4899'),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Consulta Cardiológica', 'Evaluación cardiológica', 45, '#ef4444'),
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Análisis de Sangre', 'Extracción y análisis de muestras', 15, '#10b981'),
('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Radiografía', 'Estudios radiológicos', 20, '#8b5cf6'),
('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Electrocardiograma', 'ECG y monitoreo cardíaco', 20, '#f59e0b'),
('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Vacunación', 'Aplicación de vacunas', 10, '#06b6d4'),
('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Control Prenatal', 'Seguimiento de embarazo', 40, '#f472b6')
ON CONFLICT (id) DO NOTHING;

-- Insert professionals
INSERT INTO public.professionals (id, organization_id, department_id, name, specialty, license_number) VALUES
('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Dra. María González', 'Medicina General', 'MED-2015-001'),
('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Dr. Carlos Ramírez', 'Medicina Interna', 'MED-2012-045'),
('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Dra. Ana Martínez', 'Pediatría', 'PED-2018-023'),
('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Dr. Luis Fernández', 'Pediatría', 'PED-2016-089'),
('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Dr. Roberto Silva', 'Cardiología', 'CAR-2010-012'),
('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Dra. Patricia López', 'Cardiología', 'CAR-2014-056'),
('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Lic. Jorge Méndez', 'Laboratorio Clínico', 'LAB-2017-034'),
('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'Dr. Sandra Torres', 'Radiología', 'RAD-2013-078'),
('30000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Enf. Carmen Ruiz', 'Enfermería', 'ENF-2019-091'),
('30000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'Dr. Miguel Ángel Soto', 'Medicina de Emergencias', 'EME-2011-025')
ON CONFLICT (id) DO NOTHING;

-- Insert rooms
INSERT INTO public.rooms (id, organization_id, department_id, name, capacity) VALUES
('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Consultorio 101', 1),
('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Consultorio 102', 1),
('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Consultorio Pediátrico 201', 1),
('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Consultorio Pediátrico 202', 1),
('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Consultorio Cardiología 301', 1),
('40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Sala de Extracción A', 2),
('40000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Sala de Extracción B', 2),
('40000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'Sala de Rayos X 1', 1),
('40000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'Sala de Rayos X 2', 1),
('40000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'Sala de Emergencias 1', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert schedules for professionals (Monday to Friday)
INSERT INTO public.schedules (professional_id, day_of_week, start_time, end_time) VALUES
-- Dra. María González (Lunes a Viernes, 8am-12pm)
('30000000-0000-0000-0000-000000000001', 1, '08:00', '12:00'),
('30000000-0000-0000-0000-000000000001', 2, '08:00', '12:00'),
('30000000-0000-0000-0000-000000000001', 3, '08:00', '12:00'),
('30000000-0000-0000-0000-000000000001', 4, '08:00', '12:00'),
('30000000-0000-0000-0000-000000000001', 5, '08:00', '12:00'),
-- Dr. Carlos Ramírez (Lunes a Viernes, 2pm-6pm)
('30000000-0000-0000-0000-000000000002', 1, '14:00', '18:00'),
('30000000-0000-0000-0000-000000000002', 2, '14:00', '18:00'),
('30000000-0000-0000-0000-000000000002', 3, '14:00', '18:00'),
('30000000-0000-0000-0000-000000000002', 4, '14:00', '18:00'),
('30000000-0000-0000-0000-000000000002', 5, '14:00', '18:00'),
-- Dra. Ana Martínez (Lunes, Miércoles, Viernes, 9am-1pm)
('30000000-0000-0000-0000-000000000003', 1, '09:00', '13:00'),
('30000000-0000-0000-0000-000000000003', 3, '09:00', '13:00'),
('30000000-0000-0000-0000-000000000003', 5, '09:00', '13:00'),
-- Dr. Luis Fernández (Martes, Jueves, 10am-2pm)
('30000000-0000-0000-0000-000000000004', 2, '10:00', '14:00'),
('30000000-0000-0000-0000-000000000004', 4, '10:00', '14:00'),
-- Dr. Roberto Silva (Lunes a Viernes, 8am-2pm)
('30000000-0000-0000-0000-000000000005', 1, '08:00', '14:00'),
('30000000-0000-0000-0000-000000000005', 2, '08:00', '14:00'),
('30000000-0000-0000-0000-000000000005', 3, '08:00', '14:00'),
('30000000-0000-0000-0000-000000000005', 4, '08:00', '14:00'),
('30000000-0000-0000-0000-000000000005', 5, '08:00', '14:00'),
-- Dra. Patricia López (Lunes a Viernes, 3pm-7pm)
('30000000-0000-0000-0000-000000000006', 1, '15:00', '19:00'),
('30000000-0000-0000-0000-000000000006', 2, '15:00', '19:00'),
('30000000-0000-0000-0000-000000000006', 3, '15:00', '19:00'),
('30000000-0000-0000-0000-000000000006', 4, '15:00', '19:00'),
('30000000-0000-0000-0000-000000000006', 5, '15:00', '19:00'),
-- Lic. Jorge Méndez (Lunes a Sábado, 7am-3pm)
('30000000-0000-0000-0000-000000000007', 1, '07:00', '15:00'),
('30000000-0000-0000-0000-000000000007', 2, '07:00', '15:00'),
('30000000-0000-0000-0000-000000000007', 3, '07:00', '15:00'),
('30000000-0000-0000-0000-000000000007', 4, '07:00', '15:00'),
('30000000-0000-0000-0000-000000000007', 5, '07:00', '15:00'),
('30000000-0000-0000-0000-000000000007', 6, '07:00', '15:00'),
-- Dr. Sandra Torres (Lunes a Viernes, 8am-4pm)
('30000000-0000-0000-0000-000000000008', 1, '08:00', '16:00'),
('30000000-0000-0000-0000-000000000008', 2, '08:00', '16:00'),
('30000000-0000-0000-0000-000000000008', 3, '08:00', '16:00'),
('30000000-0000-0000-0000-000000000008', 4, '08:00', '16:00'),
('30000000-0000-0000-0000-000000000008', 5, '08:00', '16:00'),
-- Enf. Carmen Ruiz (Lunes a Viernes, 7am-3pm)
('30000000-0000-0000-0000-000000000009', 1, '07:00', '15:00'),
('30000000-0000-0000-0000-000000000009', 2, '07:00', '15:00'),
('30000000-0000-0000-0000-000000000009', 3, '07:00', '15:00'),
('30000000-0000-0000-0000-000000000009', 4, '07:00', '15:00'),
('30000000-0000-0000-0000-000000000009', 5, '07:00', '15:00'),
-- Dr. Miguel Ángel Soto (24/7 - Emergencias)
('30000000-0000-0000-0000-000000000010', 0, '00:00', '23:59'),
('30000000-0000-0000-0000-000000000010', 1, '00:00', '23:59'),
('30000000-0000-0000-0000-000000000010', 2, '00:00', '23:59'),
('30000000-0000-0000-0000-000000000010', 3, '00:00', '23:59'),
('30000000-0000-0000-0000-000000000010', 4, '00:00', '23:59'),
('30000000-0000-0000-0000-000000000010', 5, '00:00', '23:59'),
('30000000-0000-0000-0000-000000000010', 6, '00:00', '23:59')
ON CONFLICT DO NOTHING;

-- Insert notification templates
INSERT INTO public.notification_templates (organization_id, type, channel, subject, template, variables) VALUES
('00000000-0000-0000-0000-000000000001', 'appointment_confirmation', 'email', 'Confirmación de Cita - Hospital Central', 
'Hola {{patient_name}},

Tu cita ha sido confirmada:
- Fecha: {{appointment_date}}
- Hora: {{appointment_time}}
- Profesional: {{professional_name}}
- Servicio: {{service_name}}
- Consultorio: {{room_name}}

Por favor llega 15 minutos antes para el check-in.

Código QR: {{qr_code}}

Saludos,
Hospital Central San José', 
'["patient_name", "appointment_date", "appointment_time", "professional_name", "service_name", "room_name", "qr_code"]'::jsonb),

('00000000-0000-0000-0000-000000000001', 'appointment_reminder', 'sms', NULL,
'Recordatorio: Tienes una cita mañana a las {{appointment_time}} con {{professional_name}}. Hospital Central San José.',
'["appointment_time", "professional_name"]'::jsonb),

('00000000-0000-0000-0000-000000000001', 'queue_called', 'sms', NULL,
'Tu turno {{ticket_code}} ha sido llamado. Por favor dirígete a {{room_name}}. Hospital Central San José.',
'["ticket_code", "room_name"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Note: Users with roles will be created via Supabase Auth
-- After creating users in Supabase Auth, their profiles will be automatically created via trigger
-- Example users to create manually in Supabase Auth:
-- 1. admin@hospital.com (role: admin) - Password: Admin123!
-- 2. recepcion@hospital.com (role: receptionist) - Password: Recep123!
-- 3. paciente1@email.com (role: user) - Password: User123!
-- 4. paciente2@email.com (role: user) - Password: User123!
-- 5. paciente3@email.com (role: user) - Password: User123!
