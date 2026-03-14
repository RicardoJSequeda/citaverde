"use client"

import { useState } from "react"
import { Menu, Calendar, Clock, User, LogOut, BarChart3, Users } from "lucide-react"
import { Button } from "@acme/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@acme/ui/sheet"
import { useRouter } from "next/navigation"

interface MobileNavProps {
  role: "user" | "admin" | "receptionist"
  userName: string
}

export function MobileNav({ role, userName }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const userLinks = [
    { href: "/dashboard", label: "Inicio", icon: Calendar },
    { href: "/dashboard/appointments/new", label: "Reservar Cita", icon: Calendar },
    { href: "/dashboard/queue/new", label: "Tomar Turno", icon: Clock },
  ]

  const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: BarChart3 },
    { href: "/admin/appointments", label: "Citas", icon: Calendar },
    { href: "/admin/resources", label: "Recursos", icon: Users },
    { href: "/admin/reports", label: "Reportes", icon: BarChart3 },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/queues", label: "Colas", icon: Clock },
  ]

  const receptionistLinks = [
    { href: "/receptionist", label: "Panel de Recepción", icon: Clock },
    { href: "/dashboard", label: "Vista Usuario", icon: User },
  ]

  const links = role === "admin" ? adminLinks : role === "receptionist" ? receptionistLinks : userLinks

  const handleNavigation = (href: string) => {
    setOpen(false)
    router.prefetch(href)
    setTimeout(() => router.push(href), 100)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 active:scale-95 transition-transform">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px]">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 mb-8">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">MediQueue</span>
          </div>

          <div className="flex-1 space-y-1">
            {links.map((link) => {
              const Icon = link.icon
              return (
                <button key={link.href} onClick={() => handleNavigation(link.href)} className="w-full">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12 text-base active:scale-[0.98] transition-transform"
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Button>
                </button>
              )
            })}
          </div>

          <div className="border-t pt-4 space-y-1">
            <div className="px-3 py-3 text-sm text-muted-foreground">
              <User className="h-4 w-4 inline mr-2" />
              {userName}
            </div>
            <form action="/auth/logout" method="post">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-base active:scale-[0.98] transition-transform"
                type="submit"
              >
                <LogOut className="h-5 w-5" />
                Cerrar Sesión
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
