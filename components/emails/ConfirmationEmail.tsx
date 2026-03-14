import React from 'react';

// Define a clear interface for the props
interface ConfirmationEmailProps {
  userName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  professionalName: string;
  bookingUrl: string;
}

// A simple, clean, and effective email template using inline styles for max compatibility.
export const ConfirmationEmail: React.FC<ConfirmationEmailProps> = ({ 
  userName, 
  appointmentDate, 
  appointmentTime, 
  serviceName, 
  professionalName,
  bookingUrl
}) => (
  <div style={{ fontFamily: 'sans-serif', padding: '20px', backgroundColor: '#f4f4f4' }}>
    <div style={{ maxWidth: '600px', margin: 'auto', backgroundColor: 'white', padding: '30px', borderRadius: '8px' }}>
      <h1 style={{ color: '#333', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>¡Cita Confirmada!</h1>
      <p style={{ fontSize: '16px', color: '#555' }}>Hola {userName},</p>
      <p style={{ fontSize: '16px', color: '#555' }}>
        Tu cita ha sido agendada con éxito. Aquí están los detalles:
      </p>
      <div style={{ padding: '20px', backgroundColor: '#fafafa', borderRadius: '5px', margin: '20px 0' }}>
        <p style={{ margin: '10px 0', fontSize: '16px' }}><strong>Servicio:</strong> {serviceName}</p>
        <p style={{ margin: '10px 0', fontSize: '16px' }}><strong>Profesional:</strong> {professionalName}</p>
        <p style={{ margin: '10px 0', fontSize: '16px' }}><strong>Fecha:</strong> {appointmentDate}</p>
        <p style={{ margin: '10px 0', fontSize: '16px' }}><strong>Hora:</strong> {appointmentTime}</p>
      </div>
      <p style={{ fontSize: '16px', color: '#555' }}>
        Si necesitas reprogramar o cancelar tu cita, puedes hacerlo desde tu panel de usuario.
      </p>
      <a 
        href={bookingUrl}
        style={{
          display: 'inline-block',
          padding: '12px 20px',
          margin: '20px 0',
          backgroundColor: '#007bff',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px',
          fontSize: '16px'
        }}
      >
        Ver mis citas
      </a>
      <p style={{ fontSize: '14px', color: '#888' }}>¡Gracias por confiar en nosotros!</p>
    </div>
  </div>
);
