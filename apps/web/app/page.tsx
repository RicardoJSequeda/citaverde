import { Button } from "@acme/ui/button"
import { Calendar, Clock, QrCode, Bell } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">MediQueue</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/check-in">
              <Button variant="ghost">Check-in</Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Registrarse</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-balance mb-6">
          Sistema de Gestión de Citas y Turnos Digitales
        </h1>
        <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto mb-8">
          Moderniza tu centro médico con reservas online, turnos digitales y notificaciones automáticas
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/sign-up">
            <Button size="lg" className="h-12 px-8">
              Comenzar Ahora
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline" className="h-12 px-8 bg-transparent">
              Ver Demo
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Reservas Online</h3>
            <p className="text-sm text-muted-foreground">
              Los pacientes pueden agendar citas 24/7 desde cualquier dispositivo
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Turnos Digitales</h3>
            <p className="text-sm text-muted-foreground">
              Elimina las filas físicas con un sistema de turnos en tiempo real
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <QrCode className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Check-in con QR</h3>
            <p className="text-sm text-muted-foreground">Registro rápido y sin contacto mediante códigos QR únicos</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center mb-4">
              <Bell className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Notificaciones</h3>
            <p className="text-sm text-muted-foreground">Recordatorios automáticos por email, SMS y WhatsApp</p>
          </div>
        </div>
      </section>
    </div>
  )
}
