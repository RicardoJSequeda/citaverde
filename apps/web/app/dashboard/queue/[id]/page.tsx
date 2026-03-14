"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@acme/ui/card"
import { Button } from "@acme/ui/button"
import { ArrowLeft, Clock, MapPin, Ticket } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function QueueTicketPage({ params }: { params: { id: string } }) {
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()
  const router = useRouter()

  useEffect(() => {
    const loadTicket = async () => {
      const { data } = await supabase
        .from("queue_tickets")
        .select(
          `
          *,
          service_type:service_types(name, color, duration_minutes),
          room:rooms(name),
          assigned_to:professionals(name, specialty)
        `,
        )
        .eq("id", params.id)
        .single()

      setTicket(data)
      setLoading(false)
    }

    loadTicket()

    const channel = supabase
      .channel(`ticket-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "queue_tickets",
          filter: `id=eq.${params.id}`,
        },
        async (payload) => {
          console.log("[v0] Ticket updated:", payload)
          // Refetch with relations
          const { data } = await supabase
            .from("queue_tickets")
            .select(
              `
              *,
              service_type:service_types(name, color, duration_minutes),
              room:rooms(name),
              assigned_to:professionals(name, specialty)
            `,
            )
            .eq("id", params.id)
            .single()

          setTicket(data)

          // Show notification when called
          if (data?.status === "called" && "Notification" in window && Notification.permission === "granted") {
            new Notification("¡Es tu turno!", {
              body: `Por favor dirígete a ${data.room?.name || "la sala asignada"}`,
              icon: "/icon.png",
            })
          }
        },
      )
      .subscribe()

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id, supabase])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
  }

  if (!ticket) {
    router.push("/dashboard")
    return null
  }

  const statusText = {
    waiting: "En Espera",
    called: "¡Te están llamando!",
    in_service: "En Atención",
    completed: "Completado",
    cancelled: "Cancelado",
    no_show: "No Presentado",
  }

  const statusColor = {
    waiting: "bg-yellow-100 text-yellow-800 border-yellow-200",
    called: "bg-green-100 text-green-800 border-green-200 animate-pulse",
    in_service: "bg-blue-100 text-blue-800 border-blue-200",
    completed: "bg-gray-100 text-gray-800 border-gray-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    no_show: "bg-red-100 text-red-800 border-red-200",
  }

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
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-4">
              <div
                className="h-32 w-32 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg mx-auto"
                style={{ backgroundColor: ticket.service_type?.color || "#3b82f6" }}
              >
                <Ticket className="h-8 w-8 mb-2" />
                <span className="text-4xl font-bold">{ticket.ticket_code}</span>
              </div>
            </div>
            <CardTitle className="text-3xl">Tu Turno</CardTitle>
            <CardDescription className="text-lg">{ticket.service_type?.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status */}
            <div
              className={`rounded-lg p-4 border-2 text-center font-semibold text-lg ${statusColor[ticket.status as keyof typeof statusColor]}`}
            >
              {statusText[ticket.status as keyof typeof statusText]}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Hora de emisión</p>
                  <p className="font-medium">
                    {new Date(ticket.issued_at).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {ticket.room && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sala asignada</p>
                    <p className="font-medium">{ticket.room.name}</p>
                  </div>
                </div>
              )}

              {ticket.assigned_to && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">{ticket.assigned_to.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Profesional</p>
                    <p className="font-medium">{ticket.assigned_to.name}</p>
                    <p className="text-xs text-muted-foreground">{ticket.assigned_to.specialty}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            {ticket.status === "waiting" && (
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Por favor espera.</strong> Recibirás una notificación cuando sea tu turno. Mantente atento a
                  las pantallas de la sala de espera.
                </p>
              </div>
            )}

            {ticket.status === "called" && (
              <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                <p className="text-sm text-green-900">
                  <strong>¡Es tu turno!</strong> Por favor dirígete a {ticket.room?.name || "la sala asignada"}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
