import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Calendar } from "lucide-react"
import { Button } from "@acme/ui/button"
import { Card, CardHeader } from "@acme/ui/card"
import Link from "next/link"
import { MobileNav } from "@/components/mobile-nav"
import { RealtimeDashboard } from "@/components/realtime-dashboard"
import { Suspense } from "react"
import { SkeletonDashboard } from "@/components/skeleton-dashboard"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (profile?.role === "admin") {
    redirect("/admin")
  }
  if (profile?.role === "receptionist") {
    redirect("/receptionist")
  }

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      `
      *,
      professional:professionals(name, specialty),
      service_type:service_types(name, color),
      room:rooms(name)
    `,
    )
    .eq("patient_id", user.id)
    .gte("appointment_date", new Date().toISOString().split("T")[0])
    .order("appointment_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(5)

  const { data: tickets } = await supabase
    .from("queue_tickets")
    .select(
      `
      *,
      service_type:service_types(name, color),
      room:rooms(name)
    `,
    )
    .eq("patient_id", user.id)
    .in("status", ["waiting", "called"])
    .order("issued_at", { ascending: false })
    .limit(3)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <MobileNav role="user" userName={profile?.full_name || "Usuario"} />
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">MediQueue</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Hola, {profile?.full_name}</span>
            <form action="/auth/logout" method="post">
              <Button variant="ghost" size="sm">
                Cerrar Sesión
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 gap-4 mb-6 md:mb-8">
          <Link href="/dashboard/appointments/new" prefetch={true} className="block">
            <Card className="hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-primary">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 md:h-12 md:w-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Calendar className="h-7 w-7 md:h-6 md:w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-semibold mb-1">Reservar Cita</h3>
                    <p className="text-sm md:text-base text-muted-foreground">Agenda una cita con anticipación</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/queue/new" prefetch={true} className="block">
            <Card className="hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-primary">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 md:h-12 md:w-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <Calendar className="h-7 w-7 md:h-6 md:w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-semibold mb-1">Tomar Turno</h3>
                    <p className="text-sm md:text-base text-muted-foreground">Obtén un turno digital ahora</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        <Suspense fallback={<SkeletonDashboard />}>
          <RealtimeDashboard userId={user.id} initialAppointments={appointments || []} initialTickets={tickets || []} />
        </Suspense>
      </div>
    </div>
  )
}
