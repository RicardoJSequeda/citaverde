import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@acme/ui/card"
import { Button } from "@acme/ui/button"
import { ArrowLeft, Clock, MapPin, User, QrCode, CheckCircle } from "lucide-react"
import Link from "next/link"
import { QRCodeDisplay } from "@/components/qr-code-display"
import { AddToCalendarButton } from "@/components/add-to-calendar-button"

export default async function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      `
      *,
      professional:professionals(name, specialty),
      service_type:service_types(name, color, duration_minutes),
      room:rooms(name)
    `,
    )
    .eq("id", params.id)
    .single()

  if (!appointment) redirect("/dashboard")

  const statusText = {
    scheduled: "Programada",
    confirmed: "Confirmada",
    checked_in: "Check-in Realizado",
    in_progress: "En Progreso",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No Asistió",
  }

  const statusColor = {
    scheduled: "bg-blue-100 text-blue-800 border-blue-200",
    confirmed: "bg-green-100 text-green-800 border-green-200",
    checked_in: "bg-purple-100 text-purple-800 border-purple-200",
    in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
    completed: "bg-gray-100 text-gray-800 border-gray-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    no_show: "bg-red-100 text-red-800 border-red-200",
  }

  const appointmentDate = new Date(appointment.appointment_date)
  const isToday = appointmentDate.toDateString() === new Date().toDateString()
  const canCheckIn = isToday && appointment.status === "scheduled"

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColor[appointment.status as keyof typeof statusColor]}`}>
                    {statusText[appointment.status as keyof typeof statusText]}
                </div>
                <AddToCalendarButton appointmentId={appointment.id} />
            </div>
            <CardTitle className="text-2xl">{appointment.service_type?.name}</CardTitle>
            <CardDescription>
              {new Date(appointment.appointment_date).toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Appointment Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Horario</p>
                  <p className="font-medium">
                    {appointment.start_time} - {appointment.end_time}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Profesional</p>
                  <p className="font-medium">{appointment.professional?.name}</p>
                  <p className="text-xs text-muted-foreground">{appointment.professional?.specialty}</p>
                </div>
              </div>

              {appointment.room && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sala</p>
                    <p className="font-medium">{appointment.room.name}</p>
                  </div>
                </div>
              )}

              {appointment.notes && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm">{appointment.notes}</p>
                </div>
              )}
            </div>

            {/* QR Code Section */}
            {appointment.status !== "cancelled" && appointment.status !== "no_show" && (
              <div className="border-t pt-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Código QR de Check-in
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {canCheckIn ? "Escanea este código al llegar a la clínica" : "Disponible el día de tu cita"}
                  </p>
                </div>

                {canCheckIn ? (
                  <div className="bg-white p-6 rounded-lg border-2 border-primary/20">
                    <QRCodeDisplay value={appointment.qr_code} size={200} />
                    <p className="text-center text-xs text-muted-foreground mt-4">Código: {appointment.qr_code}</p>
                  </div>
                ) : (
                  <div className="bg-muted/30 p-8 rounded-lg border-2 border-dashed text-center">
                    <QrCode className="h-16 w-16 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">El código QR estará disponible el día de tu cita</p>
                  </div>
                )}
              </div>
            )}

            {/* Check-in Status */}
            {appointment.checked_in_at && (
              <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Check-in realizado</p>
                    <p className="text-sm text-green-700">
                      {new Date(appointment.checked_in_at).toLocaleString("es-ES", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {appointment.status === "scheduled" && !isToday && (
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Recordatorio:</strong> No olvides llegar 10 minutos antes de tu cita. El código QR estará
                  disponible el día de tu cita.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
