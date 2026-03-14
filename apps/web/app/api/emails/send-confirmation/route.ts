import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { renderToStaticMarkup } from 'react-dom/server';
import { createClient } from '@/lib/supabase/server';
import { ConfirmationEmail } from '@/components/emails/ConfirmationEmail';

// IMPORTANT: Assumes RESEND_API_KEY is in your .env.local
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to format date and time for the email body
const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
  return {
    date: date.toLocaleDateString('es-ES', dateOptions),
    time: date.toLocaleTimeString('es-ES', timeOptions),
  };
};

export async function POST(request: Request) {
  try {
    const { appointmentId } = await request.json();

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }
    
    // Using the server client for route handlers
    const supabase = createClient();

    // Fetch appointment details along with related user, service, and professional info
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        appointment_time,
        users ( email ),
        service_types ( name ),
        professionals ( name )
      `)
      .eq('id', appointmentId)
      .single();

    if (error || !appointment) {
      console.error('Error fetching appointment:', error);
      return NextResponse.json({ error: 'Appointment not found or error fetching data' }, { status: 404 });
    }
    
    // Safely access nested data
    const user = (appointment.users as any); // Type assertion for simplicity
    const service = (appointment.service_types as any);
    const professional = (appointment.professionals as any);

    if (!user?.email || !service?.name || !professional?.name) {
        return NextResponse.json({ error: 'Incomplete appointment data' }, { status: 500 });
    }
    
    const { date, time } = formatDateTime(appointment.appointment_time);
    const bookingUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/appointments`;

    // Render the React component to an HTML string
    const emailHtml = renderToStaticMarkup(
      <ConfirmationEmail
        userName={user.email.split('@')[0]} // Simple user name extraction
        appointmentDate={date}
        appointmentTime={time}
        serviceName={service.name}
        professionalName={professional.name}
        bookingUrl={bookingUrl}
      />
    );

    // Send the email using Resend
    await resend.emails.send({
      from: 'Booking System <onboarding@resend.dev>', // Replace with your verified sender domain
      to: [user.email],
      subject: 'Confirmación de tu Cita',
      html: emailHtml,
    });

    return NextResponse.json({ message: 'Confirmation email sent successfully!' });

  } catch (e: unknown) {
    const error = e as Error;
    console.error('Failed to send email:', error);
    return NextResponse.json({ error: 'Failed to send email', details: error.message }, { status: 500 });
  }
}
