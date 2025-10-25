"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Users } from "lucide-react"
import { QueueTicketCard } from "@/components/queue-ticket-card"
import { useRealtimeQueue } from "@/lib/hooks/use-realtime-queue"
import { useMemo } from "react"

interface RealtimeReceptionistQueueProps {
  initialWaitingQueue: any[]
  initialCalledQueue: any[]
}

export function RealtimeReceptionistQueue({ initialWaitingQueue, initialCalledQueue }: RealtimeReceptionistQueueProps) {
  const allTickets = useRealtimeQueue([...initialWaitingQueue, ...initialCalledQueue])

  const waitingQueue = useMemo(
    () =>
      allTickets
        .filter((t) => t.status === "waiting")
        .sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority
          return new Date(a.issued_at).getTime() - new Date(b.issued_at).getTime()
        }),
    [allTickets],
  )

  const calledQueue = useMemo(
    () =>
      allTickets
        .filter((t) => t.status === "called")
        .sort((a, b) => new Date(b.called_at || 0).getTime() - new Date(a.called_at || 0).getTime()),
    [allTickets],
  )

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Waiting Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Cola de Espera
            <span className="text-sm font-normal text-muted-foreground">({waitingQueue.length})</span>
          </CardTitle>
          <CardDescription>Turnos pendientes de llamar</CardDescription>
        </CardHeader>
        <CardContent>
          {waitingQueue.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {waitingQueue.map((ticket: any) => (
                <QueueTicketCard key={ticket.id} ticket={ticket} status="waiting" />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No hay turnos en espera</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Called Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Turnos Llamados
            <span className="text-sm font-normal text-muted-foreground">({calledQueue.length})</span>
          </CardTitle>
          <CardDescription>En proceso de atención</CardDescription>
        </CardHeader>
        <CardContent>
          {calledQueue.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {calledQueue.map((ticket: any) => (
                <QueueTicketCard key={ticket.id} ticket={ticket} status="called" />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No hay turnos llamados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
