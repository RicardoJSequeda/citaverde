"use client"

import type React from "react"

import { Button } from "@acme/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@acme/ui/card"
import { Label } from "@acme/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@acme/ui/select"
import { ArrowLeft, Clock, Ticket } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { createQueueTicket } from "@/lib/actions/queue"

export default function NewQueueTicketPage() {
  const router = useRouter()
  const supabase = createClient()

  const [serviceTypes, setServiceTypes] = useState<any[]>([])
  const [selectedService, setSelectedService] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    async function loadServiceTypes() {
      const { data } = await supabase.from("service_types").select("*").eq("is_active", true).order("name")
      if (data) setServiceTypes(data)
    }
    loadServiceTypes()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await createQueueTicket({
        serviceTypeId: selectedService,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      if (result.ticket) {
        setIsNavigating(true)
        router.push(`/dashboard/queue/${result.ticket.id}`)
      }
    } catch (err: any) {
      setError(err.message || "Error al generar el turno")
      setIsLoading(false)
    }
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

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-14 w-14 md:h-12 md:w-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <Ticket className="h-7 w-7 md:h-6 md:w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl md:text-2xl">Tomar Turno Digital</CardTitle>
                <CardDescription className="text-sm md:text-base">Obtén tu turno para ser atendido hoy</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm md:text-base">
                    <p className="font-medium text-blue-900 mb-2">¿Cómo funciona?</p>
                    <ul className="text-blue-700 space-y-1.5">
                      <li>1. Selecciona el tipo de servicio que necesitas</li>
                      <li>2. Recibirás un número de turno único</li>
                      <li>3. Espera a que te llamen por tu número</li>
                      <li>4. Recibirás notificaciones cuando sea tu turno</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service" className="text-base">
                  Tipo de Servicio
                </Label>
                <Select value={selectedService} onValueChange={setSelectedService} required>
                  <SelectTrigger id="service" className="h-14 md:h-12 text-base">
                    <SelectValue placeholder="Selecciona el servicio que necesitas" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((service) => (
                      <SelectItem key={service.id} value={service.id} className="py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: service.color || "#3b82f6" }}
                          />
                          <span className="text-base">
                            {service.name} (≈ {service.duration_minutes} min)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

              <Button
                type="submit"
                className="w-full h-14 md:h-12 text-base font-semibold active:scale-[0.98] transition-transform"
                disabled={!selectedService || isLoading || isNavigating}
              >
                {isNavigating ? "Redirigiendo..." : isLoading ? "Generando turno..." : "Obtener Turno"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
