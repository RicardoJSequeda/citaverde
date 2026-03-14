import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import * as ics from 'ics';
import { promisify } from 'util';

// Helper to promisify the ics.createEvent callback
const createEventPromise = promisify(ics.createEvent);

export async function GET(
  request: Request,
  { params }: { params: { appointmentId: string } }
) {
  const supabase = await createClient();
  const { appointmentId } = params;

  if (!appointmentId) {
    return new NextResponse('Appointment ID is required', { status: 400 });
  }

  // Fetch appointment details
  const { data: appointment, error } = await supabase
    .from('appointments')
    .select(`
      *, 
      services(name, duration), 
      professionals(name),
      patients(full_name)
    `)
    .eq('id', appointmentId)
    .single();

  if (error || !appointment) {
    return new NextResponse('Appointment not found', { status: 404 });
  }

  const { appointment_date, start_time, services, professionals, patients } = appointment;
  const service_name = services?.name ?? 'Cita';
  const professional_name = professionals?.name ?? 'N/A';
  const patient_name = patients?.full_name ?? 'Paciente';

  // Create the .ics event object
  const [year, month, day] = (appointment_date as string).split('-').map(Number);
  const [hour, minute] = (start_time as string).split(':').map(Number);

  const event = {
    title: `Cita: ${service_name} con ${professional_name}`,
    description: `Cita para ${patient_name}.`,
    start: [year, month, day, hour, minute],
    duration: { minutes: services?.duration ?? 60 },
    status: 'CONFIRMED' as const,
    organizer: { name: professional_name, email: 'no-reply@clinic.com' },
    attendees: [
      { name: patient_name, email: 'patient@example.com', rsvp: true, partstat: 'ACCEPTED' as const, role: 'REQ-PARTICIPANT' as const }
    ]
  };

  try {
    const fileContent = await createEventPromise(event);

    if (!fileContent) {
        throw new Error('ICS file content is empty');
    }

    // Return the .ics file
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': `attachment; filename="appointment-${appointmentId}.ics"`,
      },
    });
  } catch (err) {
    console.error('Error creating ICS file:', err);
    return new NextResponse('Error generating calendar file', { status: 500 });
  }
}
