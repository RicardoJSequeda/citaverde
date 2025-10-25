"use client"

import { Calendar, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useRealtimeAppointments } from "@/lib/hooks/use-realtime-appointments"
import { useRealtimeQueue } from "@/lib/hooks/use-realtime-queue"

interface RealtimeDashboardProps {
  userId: string
  initialAppointments: any[]
  initialTickets: any[]
}

export function RealtimeDashboard({ userId, initialAppointments, initialTickets }: RealtimeDashboardProps) {
  const appointments = useRealtimeAppointments(userId, initialAppointments)
  const tickets = useRealtimeQueue(initialTickets)

  return (
    <>
      <Card className="mb-6 md:mb-8">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg md:text-xl">Próximas Citas</CardTitle>
              <CardDescription className="text-xs md:text-sm">Tus citas programadas</CardDescription>
            </div>
            <Link href="/dashboard/appointments">
              <Button variant="outline" size="sm" className="w-full sm:w-auto bg-transparent">
                Ver Todas
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {appointments && appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((apt: any) => (
                <div
                  key={apt.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border bg-card gap-3 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
                      style={{ backgroundColor: apt.service_type?.color || "#3b82f6" }}
                    >
                      {new Date(apt.appointment_date).getDate()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm md:text-base truncate">{apt.service_type?.name}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {apt.professional?.name} • {apt.start_time}
                      </p>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(apt.appointment_date).toLocaleDateString("es-ES", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground sm:hidden">
                        {new Date(apt.appointment_date).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <Link href={`/dashboard/appointments/${apt.id}`} className="w-full sm:w-auto">
                    <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                      Ver Detalles
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 md:py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 opacity-50" />
              <p className="text-sm md:text-base">No tienes citas programadas</p>
              <Link href="/dashboard/appointments/new">
                <Button className="mt-4" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Reservar Cita
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {tickets && tickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Turnos Activos</CardTitle>
            <CardDescription>Tus turnos en espera</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tickets.map((ticket: any) => (
                <div
                  key={ticket.id}
                  className={`flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-all duration-200 ${
                    ticket.status === "called" ? "ring-2 ring-green-500 animate-pulse" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="h-16 w-16 rounded-lg flex items-center justify-center text-white font-bold text-2xl shrink-0"
                      style={{ backgroundColor: ticket.service_type?.color || "#3b82f6" }}
                    >
                      {ticket.ticket_code}
                    </div>
                    <div>
                      <p className="font-semibold">{ticket.service_type?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Estado:{" "}
                        <span className={`font-medium ${ticket.status === "called" ? "text-green-600" : ""}`}>
                          {ticket.status === "waiting" ? "En espera" : "¡Te están llamando!"}
                        </span>
                      </p>
                      {ticket.room && <p className="text-sm text-muted-foreground">Sala: {ticket.room.name}</p>}
                    </div>
                  </div>
                  <Link href={`/dashboard/queue/${ticket.id}`}>
                    <Button size="sm" variant={ticket.status === "called" ? "default" : "outline"}>
                      Ver Turno
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
