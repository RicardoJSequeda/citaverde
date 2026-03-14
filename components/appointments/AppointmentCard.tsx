import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, User, Calendar, Clock, QrCode } from "lucide-react";

// Define a type for the appointment data for better type-safety
type Appointment = {
  id: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  service_types: {
    name: string;
    duration: number;
  } | null;
  professionals: {
    name: string;
    specialty: string;
  } | null;
};

interface AppointmentCardProps {
  appointment: Appointment;
}

// Helper to format date and time
const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
  return {
    date: date.toLocaleDateString('es-ES', dateOptions),
    time: date.toLocaleTimeString('es-ES', timeOptions),
  };
}

// Helper to map status to badge variant
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'default';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const { date, time } = formatDateTime(appointment.appointment_time);

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle className="text-xl">{appointment.service_types?.name || 'Servicio no especificado'}</CardTitle>
        </div>
        <Badge variant={getStatusVariant(appointment.status)}>{appointment.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center"><User className="h-5 w-5 mr-3 text-gray-500" /> <span>{appointment.professionals?.name || 'Profesional no especificado'}</span></div>
        <div className="flex items-center"><Calendar className="h-5 w-5 mr-3 text-gray-500" /> <span>{date}</span></div>
        <div className="flex items-center"><Clock className="h-5 w-5 mr-3 text-gray-500" /> <span>{time} hs</span></div>
      </CardContent>
      <CardFooter className="flex justify-end bg-gray-50 p-3 rounded-b-lg">
        <div className="flex items-center text-gray-600 cursor-pointer hover:text-blue-600">
          <QrCode className="h-5 w-5 mr-2" />
          <span className="text-sm">Mostrar QR para Check-in</span>
        </div>
      </CardFooter>
    </Card>
  );
}
