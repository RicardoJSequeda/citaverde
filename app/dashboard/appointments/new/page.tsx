"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { ArrowLeft, Clock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { createAppointment, getAvailableSlots } from "@/lib/actions/appointments"
import { HydrationBoundary } from "@/components/hydration-boundary"

export default function NewAppointmentPage() {
  const router = useRouter()
  const supabase = createClient()

  const [serviceTypes, setServiceTypes] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([])

  const [selectedService, setSelectedService] = useState("")
  const [selectedProfessional, setSelectedProfessional] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState("")
  const [notes, setNotes] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Evitar errores de hidratación
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load service types
  useEffect(() => {
    async function loadServiceTypes() {
      const { data } = await supabase.from("service_types").select("*").eq("is_active", true).order("name")
      if (data) setServiceTypes(data)
    }
    loadServiceTypes()
  }, [])

  // Load professionals when service is selected
  useEffect(() => {
    if (!selectedService) return
    async function loadProfessionals() {
      const { data } = await supabase.from("professionals").select("*").eq("is_active", true).order("name")
      if (data) setProfessionals(data)
    }
    loadProfessionals()
  }, [selectedService])

  useEffect(() => {
    if (!selectedProfessional || !selectedDate || !selectedService) return

    async function loadAvailableSlots() {
      const dateStr = selectedDate.toISOString().split("T")[0]
      const result = await getAvailableSlots(selectedProfessional, dateStr, selectedService)

      if (result.error) {
        setAvailableSlots([])
        return
      }

      setAvailableSlots(result.slots || [])
    }

    loadAvailableSlots()
  }, [selectedProfessional, selectedDate, selectedService])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!selectedDate) throw new Error("Selecciona una fecha")

      const result = await createAppointment({
        professionalId: selectedProfessional,
        serviceTypeId: selectedService,
        appointmentDate: selectedDate.toISOString().split("T")[0],
        startTime: selectedTime,
        notes: notes || undefined,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      setIsNavigating(true)
      router.push("/dashboard?success=appointment_created")
    } catch (err: any) {
      setError(err.message || "Error al crear la cita")
      setIsLoading(false)
    }
  }

  // Evitar errores de hidratación
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <HydrationBoundary>
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

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Reservar Nueva Cita</CardTitle>
            <CardDescription className="text-sm md:text-base">
              Completa el formulario para agendar tu cita médica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Service Type */}
              <div className="space-y-2">
                <Label htmlFor="service" className="text-base">
                  Tipo de Servicio
                </Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger id="service" className="h-12 md:h-10">
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} ({service.duration_minutes} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Professional */}
              {selectedService && (
                <div className="space-y-2">
                  <Label htmlFor="professional" className="text-base">
                    Profesional
                  </Label>
                  <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                    <SelectTrigger id="professional" className="h-12 md:h-10">
                      <SelectValue placeholder="Selecciona un profesional" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {prof.name} - {prof.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date */}
              {selectedProfessional && (
                <div className="space-y-2">
                  <Label className="text-base">Fecha</Label>
                  <div className="border rounded-lg p-3 md:p-4 bg-white">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
                      className="mx-auto"
                    />
                  </div>
                </div>
              )}

              {/* Time Slots */}
              {selectedDate && availableSlots.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-base">Horario Disponible</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant={selectedTime === slot ? "default" : "outline"}
                        className="h-14 md:h-12 text-base active:scale-95 transition-transform"
                        onClick={() => setSelectedTime(slot)}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {selectedDate && availableSlots.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No hay horarios disponibles para esta fecha
                </div>
              )}

              {/* Notes */}
              {selectedTime && (
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-base">
                    Notas (opcional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Información adicional sobre tu consulta..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="text-base"
                  />
                </div>
              )}

              {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

              <Button
                type="submit"
                className="w-full h-14 md:h-12 text-base font-semibold active:scale-[0.98] transition-transform"
                disabled={!selectedTime || isLoading || isNavigating}
              >
                {isNavigating ? "Redirigiendo..." : isLoading ? "Reservando..." : "Confirmar Reserva"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
    </HydrationBoundary>
  )
}
