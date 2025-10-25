"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TestSimplePage() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadServices() {
      try {
        setLoading(true)
        setError(null)

        console.log('Intentando cargar servicios...')
        
        const { data, error } = await supabase
          .from('service_types')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (error) {
          console.error('Error:', error)
          setError(`Error: ${error.message}`)
          return
        }

        console.log('Servicios cargados:', data)
        setServices(data || [])

      } catch (err: any) {
        console.error('Error general:', err)
        setError(`Error general: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadServices()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Cargando servicios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-8">Prueba Simple de Servicios</h1>
        
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">{error}</p>
              <p className="text-sm text-red-600 mt-2">
                Este error indica que necesitas ejecutar el script SQL en tu base de datos de Supabase.
              </p>
            </CardContent>
          </Card>
        )}

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

        <div className="mt-6 text-center space-x-4">
          <Button asChild>
            <a href="/dashboard/appointments/new">Ir a Crear Cita</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/test-services">Página de Prueba Completa</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
