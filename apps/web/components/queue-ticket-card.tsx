"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@acme/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@acme/ui/select"
import { Phone, CheckCircle, XCircle, Clock, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import { callQueueTicket, completeQueueTicket, markQueueTicketNoShow } from "@/lib/actions/queue"

interface QueueTicketCardProps {
  ticket: any
  status: "waiting" | "called"
}

export function QueueTicketCard({ ticket, status }: QueueTicketCardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(ticket.room_id || "")
  const [rooms, setRooms] = useState<any[]>([])

  useEffect(() => {
    async function loadRooms() {
      const { data } = await supabase.from("rooms").select("*").eq("is_active", true).order("name")
      if (data) setRooms(data)
    }
    loadRooms()
  }, [])

  const handleCall = async () => {
    setIsLoading(true)
    try {
      const result = await callQueueTicket(ticket.id, selectedRoom || undefined)
      if (result.error) {
        console.error("[v0] Error calling ticket:", result.error)
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error("[v0] Error calling ticket:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      const result = await completeQueueTicket(ticket.id)
      if (result.error) {
        console.error("[v0] Error completing ticket:", result.error)
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error("[v0] Error completing ticket:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNoShow = async () => {
    setIsLoading(true)
    try {
      const result = await markQueueTicketNoShow(ticket.id)
      if (result.error) {
        console.error("[v0] Error marking no show:", result.error)
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error("[v0] Error marking no show:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const waitTime = Math.floor((new Date().getTime() - new Date(ticket.issued_at).getTime()) / 1000 / 60)

  return (
    <div
      className={`p-4 rounded-lg border-2 ${
        status === "called" ? "border-green-200 bg-green-50" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="h-14 w-14 rounded-lg flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: ticket.service_type?.color || "#3b82f6" }}
          >
            {ticket.ticket_code}
          </div>
          <div>
            <p className="font-semibold">{ticket.patient_name || "Anónimo"}</p>
            <p className="text-sm text-muted-foreground">{ticket.service_type?.name}</p>
            {ticket.patient_phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {ticket.patient_phone}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            <span>{waitTime} min</span>
          </div>
          {ticket.priority > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">Prioritario</span>
          )}
        </div>
      </div>

      {ticket.room && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <MapPin className="h-4 w-4" />
          <span>{ticket.room.name}</span>
        </div>
      )}

      {status === "waiting" ? (
        <div className="flex items-center gap-2">
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Seleccionar sala" />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCall} disabled={isLoading || !selectedRoom} className="gap-2">
            <Phone className="h-4 w-4" />
            Llamar
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button onClick={handleComplete} disabled={isLoading} className="flex-1 gap-2" variant="default">
            <CheckCircle className="h-4 w-4" />
            Completar
          </Button>
          <Button onClick={handleNoShow} disabled={isLoading} variant="outline" className="gap-2 bg-transparent">
            <XCircle className="h-4 w-4" />
            No Asistió
          </Button>
        </div>
      )}
    </div>
  )
}
