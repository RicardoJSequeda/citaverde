"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export function useRealtimeAppointments(userId: string, initialAppointments: any[]) {
  const [appointments, setAppointments] = useState(initialAppointments)
  const supabase = createBrowserClient()

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel("appointments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `patient_id=eq.${userId}`,
        },
        async (payload) => {
          console.log("[v0] Realtime appointment update:", payload)

          if (payload.eventType === "INSERT") {
            const { data } = await supabase
              .from("appointments")
              .select(`
                *,
                professional:professionals(name, specialty),
                service_type:service_types(name, color),
                room:rooms(name)
              `)
              .eq("id", payload.new.id)
              .single()

            if (data) {
              setAppointments((prev) =>
                [data, ...prev].sort(
                  (a, b) =>
                    new Date(a.appointment_date + " " + a.start_time).getTime() -
                    new Date(b.appointment_date + " " + b.start_time).getTime(),
                ),
              )
            }
          } else if (payload.eventType === "UPDATE") {
            const { data } = await supabase
              .from("appointments")
              .select(`
                *,
                professional:professionals(name, specialty),
                service_type:service_types(name, color),
                room:rooms(name)
              `)
              .eq("id", payload.new.id)
              .single()

            if (data) {
              setAppointments((prev) => prev.map((apt) => (apt.id === data.id ? data : apt)))
            }
          } else if (payload.eventType === "DELETE") {
            setAppointments((prev) => prev.filter((apt) => apt.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  return appointments
}
