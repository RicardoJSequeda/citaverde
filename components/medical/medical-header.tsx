import { cn } from "@/lib/utils"
import { Bell, Settings, LogOut, User, Home, Menu } from "lucide-react"
import { useState } from "react"

interface MedicalHeaderProps {
  userName: string
  userRole: "patient" | "professional" | "receptionist" | "admin"
  unreadNotifications?: number
  onLogout?: () => void
  onNavigate?: (route: string) => void
  className?: string
}

const roleConfig = {
  patient: { label: "Paciente", color: "bg-medical-success", icon: "🏥" },
  professional: { label: "Profesional", color: "bg-medical-primary", icon: "👨‍⚕️" },
  receptionist: { label: "Recepcionista", color: "bg-medical-secondary", icon: "📋" },
  admin: { label: "Administrador", color: "bg-medical-alert", icon: "🔐" },
}

export function MedicalHeader({
  userName,
  userRole,
  unreadNotifications = 0,
  onLogout,
  onNavigate,
  className,
}: MedicalHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const role = roleConfig[userRole]

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-white dark:bg-medical-neutral-900 border-b border-medical-border-light",
        "shadow-sm",
        className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and app name */}
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-medical-primary">
              🏥
            </div>
            <div>
              <h1 className="text-lg font-bold text-medical-foreground">CitaVerde</h1>
              <p className="text-xs text-medical-foreground-secondary hidden sm:block">
                Sistema de Gestión Médica
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => onNavigate?.("/")}
              className="flex items-center gap-2 text-medical-foreground-secondary hover:text-medical-primary transition"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Inicio</span>
            </button>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            {/* User info */}
            <div className="hidden sm:flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
                role.color,
              )}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-medical-foreground">{userName}</p>
                <p className="text-xs text-medical-foreground-secondary">{role.label}</p>
              </div>
            </div>

            {/* Notifications */}
            <button
              className="relative p-2 rounded-lg hover:bg-medical-background-secondary transition"
              aria-label="Notificaciones"
            >
              <Bell className="w-5 h-5 text-medical-foreground-secondary" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-medical-alert text-white text-xs flex items-center justify-center font-bold">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>

            {/* Settings */}
            <button
              className="p-2 rounded-lg hover:bg-medical-background-secondary transition"
              aria-label="Configuración"
            >
              <Settings className="w-5 h-5 text-medical-foreground-secondary" />
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-medical-background-secondary transition"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 h-5 text-medical-foreground-secondary" />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-medical-background-secondary transition"
              aria-label="Menú"
            >
              <Menu className="w-5 h-5 text-medical-foreground-secondary" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-medical-border-light py-4 space-y-2">
            <button
              onClick={() => {
                onNavigate?.("/")
                setMobileMenuOpen(false)
              }}
              className="flex items-center gap-2 w-full p-3 text-medical-foreground hover:bg-medical-background-secondary rounded-lg transition"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Inicio</span>
            </button>

            <div className="border-t border-medical-border-light pt-4 mt-4">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs",
                  role.color,
                )}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-medical-foreground">{userName}</p>
                  <p className="text-xs text-medical-foreground-secondary">{role.label}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default MedicalHeader
