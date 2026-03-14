/* eslint-disable no-console */
import { createClient } from '@/utils/supabase/server';
import { Twilio } from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const twilioWhatsAppPhoneNumber = process.env.TWILIO_WHATSAPP_NUMBER;

const twilioClient = accountSid && authToken ? new Twilio(accountSid, authToken) : null;

async function sendSmsNotification(phoneNumber: string, message: string) {
  if (!twilioClient || !twilioPhoneNumber) {
    console.error('Twilio SMS config is missing. Skipping SMS notification.');
    // In a real app, you might want to throw an error or handle this differently
    return;
  }

  try {
    await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });
    console.log(`SMS notification sent to ${phoneNumber}`);
  } catch (error) {
    console.error(`Failed to send SMS to ${phoneNumber}:`, error);
  }
}

async function sendWhatsAppNotification(phoneNumber: string, message: string) {
    if (!twilioClient || !twilioWhatsAppPhoneNumber) {
      console.error('Twilio WhatsApp config is missing. Skipping WhatsApp notification.');
      return;
    }
  
    try {
      await twilioClient.messages.create({
        body: message,
        from: `whatsapp:${twilioWhatsAppPhoneNumber}`,
        to: `whatsapp:${phoneNumber}`,
      });
      console.log(`WhatsApp notification sent to ${phoneNumber}`);
    } catch (error) {
      console.error(`Failed to send WhatsApp to ${phoneNumber}:`, error);
    }
}

async function sendEmailNotification(to: string, subject: string, body: string) {
  // This is a mock. In a real app, you would use a service like SendGrid, Postmark, or AWS SES.
  console.log(`--- Sending Email ---`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  console.log(`---------------------`);
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log(`Email notification sent to ${to}`);
}

export async function handleNotification(notification: any) {
  const supabase = createClient();

  console.log(`Processing notification for appointment: ${notification.appointment_id}`);

  const { data: appointment, error } = await supabase
    .from('appointments')
    .select(`
      date,
      start_time,
      profiles ( id, full_name, email, phone_number ),
      professionals ( full_name ),
      service_types ( name )
    `)
    .eq('id', notification.appointment_id)
    .single();

  if (error || !appointment) {
    console.error('Error fetching appointment details:', error);
    return;
  }

  const { profiles: user, professionals, service_types, date, start_time } = appointment;
  const appointmentDateTime = new Date(`${date}T${start_time}`);

  if (!user) {
    console.error('Notification has no associated user.');
    return;
  }

  const messageBody = `Hola ${user.full_name}, tu cita para '${service_types.name}' con ${professionals.full_name} está confirmada para el ${appointmentDateTime.toLocaleDateString()} a las ${appointmentDateTime.toLocaleTimeString()}.`;

  // Send Email
  if (user.email) {
    await sendEmailNotification(user.email, 'Confirmación de Cita', messageBody);
  }

  // Send SMS and/or WhatsApp if phone number is present
  if (user.phone_number) {
      // You can decide whether to send both or choose one.
      // For this example, we'll send both if configured.
      await sendSmsNotification(user.phone_number, messageBody);
      await sendWhatsAppNotification(user.phone_number, messageBody)
  } else {
      console.log('User does not have a phone number, skipping SMS/WhatsApp.')
  }
}
