-- ============================================
-- SEED DATA
-- ============================================

-- Insert demo organization
INSERT INTO public.organizations (id, name, address, phone, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Hospital Central',
  'Av. Principal 123, Ciudad',
  '+1234567890',
  'info@hospitalcentral.com'
) ON CONFLICT (id) DO NOTHING;

-- Insert departments
INSERT INTO public.departments (id, organization_id, name, description) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Medicina General', 'Consultas médicas generales'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Pediatría', 'Atención pediátrica'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Laboratorio', 'Análisis clínicos'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Radiología', 'Estudios de imagen')
ON CONFLICT (id) DO NOTHING;

-- Insert service types
INSERT INTO public.service_types (id, organization_id, name, description, duration_minutes, color) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Consulta General', 'Consulta médica general', 30, '#3b82f6'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Consulta Pediátrica', 'Consulta de pediatría', 30, '#10b981'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Análisis de Sangre', 'Extracción y análisis', 15, '#f59e0b'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Radiografía', 'Estudio radiológico', 20, '#ef4444')
ON CONFLICT (id) DO NOTHING;

-- Insert professionals
INSERT INTO public.professionals (id, organization_id, department_id, name, specialty, license_number) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Dr. Juan Pérez', 'Medicina General', 'MED-12345'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Dra. María García', 'Pediatría', 'PED-67890'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Lic. Carlos López', 'Laboratorio Clínico', 'LAB-11111'),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Dr. Ana Martínez', 'Radiología', 'RAD-22222')
ON CONFLICT (id) DO NOTHING;

-- Insert rooms
INSERT INTO public.rooms (id, organization_id, department_id, name) VALUES
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Consultorio 1'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Consultorio 2'),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Consultorio Pediatría'),
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Sala de Extracción'),
  ('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Sala de Rayos X')
ON CONFLICT (id) DO NOTHING;

-- Insert schedules (Monday to Friday, 8:00 - 17:00)
INSERT INTO public.schedules (professional_id, day_of_week, start_time, end_time) VALUES
  -- Dr. Juan Pérez (Mon-Fri)
  ('30000000-0000-0000-0000-000000000001', 1, '08:00', '17:00'),
  ('30000000-0000-0000-0000-000000000001', 2, '08:00', '17:00'),
  ('30000000-0000-0000-0000-000000000001', 3, '08:00', '17:00'),
  ('30000000-0000-0000-0000-000000000001', 4, '08:00', '17:00'),
  ('30000000-0000-0000-0000-000000000001', 5, '08:00', '17:00'),
  -- Dra. María García (Mon-Fri)
  ('30000000-0000-0000-0000-000000000002', 1, '09:00', '18:00'),
  ('30000000-0000-0000-0000-000000000002', 2, '09:00', '18:00'),
  ('30000000-0000-0000-0000-000000000002', 3, '09:00', '18:00'),
  ('30000000-0000-0000-0000-000000000002', 4, '09:00', '18:00'),
  ('30000000-0000-0000-0000-000000000002', 5, '09:00', '18:00')
ON CONFLICT DO NOTHING;

-- Insert notification templates
INSERT INTO public.notification_templates (organization_id, type, channel, subject, template) VALUES
  ('00000000-0000-0000-0000-000000000001', 'appointment_reminder', 'email', 'Recordatorio de Cita', 'Hola {{patient_name}}, te recordamos tu cita el {{date}} a las {{time}} con {{professional_name}}.'),
  ('00000000-0000-0000-0000-000000000001', 'appointment_confirmation', 'email', 'Confirmación de Cita', 'Tu cita ha sido confirmada para el {{date}} a las {{time}}. Código QR: {{qr_code}}'),
  ('00000000-0000-0000-0000-000000000001', 'queue_called', 'sms', 'Tu turno está listo', 'Turno {{ticket_code}}: Por favor dirígete a {{room_name}}')
ON CONFLICT DO NOTHING;
