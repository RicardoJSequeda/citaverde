"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export function useRealtimeQueue(initialTickets: any[]) {
  const [tickets, setTickets] = useState(initialTickets)
  const supabase = createBrowserClient()

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel("queue-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_tickets",
        },
        async (payload) => {
          console.log("[v0] Realtime queue update:", payload)

          if (payload.eventType === "INSERT") {
            // Fetch full ticket data with relations
            const { data } = await supabase
              .from("queue_tickets")
              .select(`
                *,
                service_type:service_types(name, color, duration_minutes),
                room:rooms(name),
                assigned_to:professionals(name)
              `)
              .eq("id", payload.new.id)
              .single()

            if (data) {
              setTickets((prev) => [data, ...prev])
            }
          } else if (payload.eventType === "UPDATE") {
            // Fetch updated ticket data
            const { data } = await supabase
              .from("queue_tickets")
              .select(`
                *,
                service_type:service_types(name, color, duration_minutes),
                room:rooms(name),
                assigned_to:professionals(name)
              `)
              .eq("id", payload.new.id)
              .single()

            if (data) {
              setTickets((prev) => prev.map((ticket) => (ticket.id === data.id ? data : ticket)))
            }
          } else if (payload.eventType === "DELETE") {
            setTickets((prev) => prev.filter((ticket) => ticket.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return tickets
}
