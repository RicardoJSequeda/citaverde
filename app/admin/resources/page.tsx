import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Building, Stethoscope, DoorOpen } from "lucide-react"
import Link from "next/link"
import { AddProfessionalDialog } from "@/components/admin/add-professional-dialog"
import { AddServiceDialog } from "@/components/admin/add-service-dialog"
import { AddDepartmentDialog } from "@/components/admin/add-department-dialog"
import { AddRoomDialog } from "@/components/admin/add-room-dialog"

export default async function ResourcesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")

  // Get all resources
  const { data: professionals } = await supabase
    .from("professionals")
    .select("*, department:departments(name)")
    .order("name")

  const { data: departments } = await supabase.from("departments").select("*").order("name")

  const { data: serviceTypes } = await supabase.from("service_types").select("*").order("name")

  const { data: rooms } = await supabase.from("rooms").select("*, department:departments(name)").order("name")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gestión de Recursos</h1>
          <p className="text-muted-foreground">Administra profesionales, departamentos, servicios y salas</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Professionals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Stethoscope className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Profesionales</CardTitle>
                    <CardDescription>{professionals?.length || 0} registrados</CardDescription>
                  </div>
                </div>
                <AddProfessionalDialog />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {professionals?.map((prof: any) => (
                  <div key={prof.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="font-medium">{prof.name}</p>
                      <p className="text-sm text-muted-foreground">{prof.specialty}</p>
                      {prof.department && <p className="text-xs text-muted-foreground">{prof.department.name}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          prof.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {prof.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Departments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Building className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Departamentos</CardTitle>
                    <CardDescription>{departments?.length || 0} departamentos</CardDescription>
                  </div>
                </div>
                <AddDepartmentDialog />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {departments?.map((dept: any) => (
                  <div key={dept.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="font-medium">{dept.name}</p>
                      <p className="text-sm text-muted-foreground">{dept.description}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        dept.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {dept.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Service Types */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Tipos de Servicio</CardTitle>
                    <CardDescription>{serviceTypes?.length || 0} servicios</CardDescription>
                  </div>
                </div>
                <AddServiceDialog />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {serviceTypes?.map((service: any) => (
                  <div key={service.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: service.color }} />
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">{service.duration_minutes} minutos</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        service.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {service.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rooms */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <DoorOpen className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>Salas</CardTitle>
                    <CardDescription>{rooms?.length || 0} salas</CardDescription>
                  </div>
                </div>
                <AddRoomDialog />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rooms?.map((room: any) => (
                  <div key={room.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="font-medium">{room.name}</p>
                      {room.department && <p className="text-sm text-muted-foreground">{room.department.name}</p>}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        room.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {room.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
