"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestServicesPage() {
  const [services, setServices] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        // Cargar servicios
        const { data: servicesData, error: servicesError } = await supabase
          .from('service_types')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (servicesError) {
          console.error('Error al cargar servicios:', servicesError)
          setError(`Error al cargar servicios: ${servicesError.message}`)
          return
        }

        setServices(servicesData || [])

        // Cargar profesionales
        const { data: professionalsData, error: professionalsError } = await supabase
          .from('professionals')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (professionalsError) {
          console.error('Error al cargar profesionales:', professionalsError)
          setError(`Error al cargar profesionales: ${professionalsError.message}`)
          return
        }

        setProfessionals(professionalsData || [])

      } catch (err: any) {
        console.error('Error general:', err)
        setError(`Error general: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-8">Prueba de Conexión a Base de Datos</h1>
        
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Servicios */}
          <Card>
            <CardHeader>
              <CardTitle>Servicios Disponibles ({services.length})</CardTitle>
              <CardDescription>Tipos de servicios activos en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {services.length > 0 ? (
                <div className="space-y-2">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: service.color || '#3b82f6' }}
                      />
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-gray-600">
                          {service.duration_minutes} minutos
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No se encontraron servicios</p>
              )}
            </CardContent>
          </Card>

          {/* Profesionales */}
          <Card>
            <CardHeader>
              <CardTitle>Profesionales Disponibles ({professionals.length})</CardTitle>
              <CardDescription>Profesionales activos en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {professionals.length > 0 ? (
                <div className="space-y-2">
                  {professionals.map((professional) => (
                    <div key={professional.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium">{professional.name}</p>
                      <p className="text-sm text-gray-600">{professional.specialty}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No se encontraron profesionales</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-center">
          <a 
            href="/dashboard/appointments/new" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir a Crear Cita
          </a>
        </div>
      </div>
    </div>
  )
}
