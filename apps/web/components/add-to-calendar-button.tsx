'use client'

import { Button } from "@acme/ui"
import { CalendarPlus } from "lucide-react"
import { toast } from "sonner"

export function AddToCalendarButton({ appointmentId }: { appointmentId: string }) {
  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/calendar/${appointmentId}`)

      if (!response.ok) {
        throw new Error("Failed to download calendar file.")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `appointment-${appointmentId}.ics`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success("Evento de calendario descargado.", {
        description: "Abre el archivo descargado para añadir la cita a tu calendario.",
      })

    } catch (error) {
      console.error(error)
      toast.error("Error al descargar el archivo.", {
        description: "Por favor, inténtalo de nuevo más tarde.",
      })
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <CalendarPlus className="h-4 w-4 mr-2" />
      Añadir al Calendario
    </Button>
  )
}
