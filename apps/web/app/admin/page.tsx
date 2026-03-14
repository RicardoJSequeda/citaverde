import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@acme/ui/card"
import { Calendar, Users, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@acme/ui/button"

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  // Get today's date
  const today = new Date().toISOString().split("T")[0]

  // KPI: Total appointments today
  const { count: appointmentsToday } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("appointment_date", today)

  // KPI: Checked-in appointments
  const { count: checkedInToday } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("appointment_date", today)
    .eq("status", "checked_in")

  // KPI: Active queue tickets
  const { count: activeTickets } = await supabase
    .from("queue_tickets")
    .select("*", { count: "exact", head: true })
    .in("status", ["waiting", "called"])

  // KPI: Total patients (unique users with appointments)
  const { count: totalPatients } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "user")

  // Recent appointments
  const { data: recentAppointments } = await supabase
    .from("appointments")
    .select(
      `
      *,
      patient:profiles!appointments_patient_id_fkey(full_name),
      professional:professionals(name),
      service_type:service_types(name, color)
    `,
    )
    .gte("appointment_date", today)
    .order("appointment_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(5)

  // Active queue
  const { data: activeQueue } = await supabase
    .from("queue_tickets")
    .select(
      `
      *,
      service_type:service_types(name, color)
    `,
    )
    .in("status", ["waiting", "called"])
    .order("issued_at", { ascending: true })
    .limit(5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">MediQueue Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Admin: {profile?.full_name}</span>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Vista Usuario
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* KPIs */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Citas Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{appointmentsToday || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total programadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Check-ins</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{checkedInToday || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {appointmentsToday ? Math.round(((checkedInToday || 0) / appointmentsToday) * 100) : 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Turnos Activos</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeTickets || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">En espera o llamados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pacientes</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalPatients || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Registrados</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Link href="/admin/appointments">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Gestionar Citas</CardTitle>
                <CardDescription>Ver y administrar todas las citas</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/resources">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Recursos</CardTitle>
                <CardDescription>Profesionales, salas y servicios</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/reports">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Reportes</CardTitle>
                <CardDescription>Estadísticas y análisis</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Appointments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Próximas Citas</CardTitle>
                  <CardDescription>Citas programadas desde hoy</CardDescription>
                </div>
                <Link href="/admin/appointments">
                  <Button variant="outline" size="sm">
                    Ver Todas
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentAppointments && recentAppointments.length > 0 ? (
                <div className="space-y-3">
                  {recentAppointments.map((apt: any) => (
                    <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: apt.service_type?.color || "#3b82f6" }}
                        >
                          {new Date(apt.appointment_date).getDate()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{apt.patient?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {apt.service_type?.name} • {apt.start_time}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{apt.professional?.name}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            apt.status === "checked_in"
                              ? "bg-green-100 text-green-700"
                              : apt.status === "scheduled"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay citas programadas</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Queue */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cola de Turnos</CardTitle>
                  <CardDescription>Turnos activos en espera</CardDescription>
                </div>
                <Link href="/receptionist">
                  <Button variant="outline" size="sm">
                    Gestionar
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {activeQueue && activeQueue.length > 0 ? (
                <div className="space-y-3">
                  {activeQueue.map((ticket: any) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: ticket.service_type?.color || "#3b82f6" }}
                        >
                          {ticket.ticket_code}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{ticket.patient_name || "Anónimo"}</p>
                          <p className="text-xs text-muted-foreground">{ticket.service_type?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(ticket.issued_at).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            ticket.status === "called" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {ticket.status === "called" ? "Llamado" : "Esperando"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay turnos activos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
