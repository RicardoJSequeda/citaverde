"use client"

import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription"
import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { QueueTicket } from "@/components/medical/queue-ticket"
import { Bell } from "lucide-react"

interface RealtimeDashboardProps {
  userId: string
  initialAppointments: any[]
  initialTickets: any[]
}

export function RealtimeDashboard({ userId, initialAppointments, initialTickets }: RealtimeDashboardProps) {
  const appointments = useRealtimeSubscription(
    'appointments',
    initialAppointments,
    `patient_id=eq.${userId}`
  );

  const tickets = useRealtimeSubscription(
    'queue_tickets',
    initialTickets,
    `patient_id=eq.${userId}`
  );

  return (
    <div>
      {tickets.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Mis Turnos Activos</h2>
          <div className="space-y-4">
            {tickets.map((ticket: any) => (
              <QueueTicket key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-4">Próximas Citas</h2>
        {appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((appointment: any) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
             <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No tienes próximas citas.</p>
            <p className="text-sm">¡Reserva una para empezar!</p>
          </div>
        )}
      </div>
    </div>
  )
}
