import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Search } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"

export default async function AppointmentsManagementPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")

  const today = new Date().toISOString().split("T")[0]

  // Get all appointments from today onwards
  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      `
      *,
      patient:profiles!appointments_patient_id_fkey(full_name, phone),
      professional:professionals(name, specialty),
      service_type:service_types(name, color),
      room:rooms(name)
    `,
    )
    .gte("appointment_date", today)
    .order("appointment_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(50)

  const statusText = {
    scheduled: "Programada",
    confirmed: "Confirmada",
    checked_in: "Check-in",
    in_progress: "En Progreso",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No Asistió",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle className="text-2xl">Gestión de Citas</CardTitle>
                <CardDescription>Todas las citas programadas desde hoy</CardDescription>
              </div>
              <Button>Nueva Cita</Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por paciente, profesional..." className="pl-10" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {appointments && appointments.length > 0 ? (
                appointments.map((apt: any) => (
                  <div key={apt.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-4">
                      <div
                        className="h-14 w-14 rounded-lg flex flex-col items-center justify-center text-white"
                        style={{ backgroundColor: apt.service_type?.color || "#3b82f6" }}
                      >
                        <span className="text-xs font-medium">
                          {new Date(apt.appointment_date).toLocaleDateString("es-ES", { month: "short" })}
                        </span>
                        <span className="text-xl font-bold">{new Date(apt.appointment_date).getDate()}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{apt.patient?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {apt.service_type?.name} • {apt.start_time}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {apt.professional?.name} • {apt.room?.name || "Sin sala"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-medium ${
                            apt.status === "checked_in"
                              ? "bg-purple-100 text-purple-700"
                              : apt.status === "confirmed"
                                ? "bg-green-100 text-green-700"
                                : apt.status === "scheduled"
                                  ? "bg-blue-100 text-blue-700"
                                  : apt.status === "completed"
                                    ? "bg-gray-100 text-gray-700"
                                    : "bg-red-100 text-red-700"
                          }`}
                        >
                          {statusText[apt.status as keyof typeof statusText]}
                        </span>
                      </div>
                      <Button variant="outline" size="sm">
                        Ver
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No hay citas programadas</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
