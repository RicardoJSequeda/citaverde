import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card"
import { Clock, Users, CheckCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@acme/ui/button"
import { RealtimeReceptionistQueue } from "@/components/realtime-receptionist-queue"
import { Suspense } from "react"

export default async function ReceptionistPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (profile?.role !== "receptionist" && profile?.role !== "admin") {
    redirect("/dashboard")
  }

  // Get today's stats
  const today = new Date().toISOString().split("T")[0]

  const { count: waitingTickets } = await supabase
    .from("queue_tickets")
    .select("*", { count: "exact", head: true })
    .eq("status", "waiting")
    .gte("issued_at", `${today}T00:00:00`)

  const { count: calledTickets } = await supabase
    .from("queue_tickets")
    .select("*", { count: "exact", head: true })
    .eq("status", "called")
    .gte("issued_at", `${today}T00:00:00`)

  const { count: completedToday } = await supabase
    .from("queue_tickets")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("issued_at", `${today}T00:00:00`)

  // Get waiting queue
  const { data: waitingQueue } = await supabase
    .from("queue_tickets")
    .select(
      `
      *,
      service_type:service_types(name, color, duration_minutes),
      room:rooms(name),
      assigned_to:professionals(name)
    `,
    )
    .eq("status", "waiting")
    .order("priority", { ascending: false })
    .order("issued_at", { ascending: true })

  // Get called queue
  const { data: calledQueue } = await supabase
    .from("queue_tickets")
    .select(
      `
      *,
      service_type:service_types(name, color, duration_minutes),
      room:rooms(name),
      assigned_to:professionals(name)
    `,
    )
    .eq("status", "called")
    .order("called_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Panel de Recepción</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Recepcionista: {profile?.full_name}</span>
            {profile?.role === "admin" && (
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  Vista Admin
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">En Espera</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{waitingTickets || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Turnos esperando</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Llamados</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{calledTickets || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">En proceso de atención</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completados Hoy</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedToday || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Turnos finalizados</p>
            </CardContent>
          </Card>
        </div>

        <Suspense fallback={<div>Cargando cola...</div>}>
          <RealtimeReceptionistQueue initialWaitingQueue={waitingQueue || []} initialCalledQueue={calledQueue || []} />
        </Suspense>
      </div>
    </div>
  )
}
