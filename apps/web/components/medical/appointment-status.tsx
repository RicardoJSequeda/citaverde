import { cn } from "@acme/shared"
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Loader2,
  DoneAll 
} from "lucide-react"

type AppointmentStatus = 
  | "scheduled" 
  | "confirmed" 
  | "in_progress" 
  | "completed" 
  | "cancelled" 
  | "no_show"
  | "pending"

interface AppointmentStatusProps {
  status: AppointmentStatus
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

const statusConfig: Record<AppointmentStatus, {
  icon: React.ReactNode
  label: string
  color: string
  bgColor: string
  description: string
}> = {
  scheduled: {
    icon: <Clock className="w-full h-full" />,
    label: "Agendada",
    color: "text-medical-primary",
    bgColor: "bg-medical-primary-lighter",
    description: "Tu cita está programada",
  },
  confirmed: {
    icon: <CheckCircle2 className="w-full h-full" />,
    label: "Confirmada",
    color: "text-medical-success",
    bgColor: "bg-medical-success-lighter",
    description: "Tu cita ha sido confirmada",
  },
  in_progress: {
    icon: <Loader2 className="w-full h-full animate-spin" />,
    label: "En progreso",
    color: "text-medical-info",
    bgColor: "bg-medical-info-lighter",
    description: "Tu cita está en progreso",
  },
  completed: {
    icon: <DoneAll className="w-full h-full" />,
    label: "Completada",
    color: "text-medical-success",
    bgColor: "bg-medical-success-lighter",
    description: "Tu cita ha sido completada",
  },
  cancelled: {
    icon: <XCircle className="w-full h-full" />,
    label: "Cancelada",
    color: "text-medical-neutral-600",
    bgColor: "bg-medical-neutral-200",
    description: "Tu cita ha sido cancelada",
  },
  no_show: {
    icon: <AlertCircle className="w-full h-full" />,
    label: "No mostrado",
    color: "text-medical-alert",
    bgColor: "bg-medical-alert-lighter",
    description: "No se presentó a la cita",
  },
  pending: {
    icon: <Clock className="w-full h-full" />,
    label: "Pendiente",
    color: "text-medical-warning",
    bgColor: "bg-medical-warning-lighter",
    description: "Pendiente de confirmación",
  },
}

export function AppointmentStatus({
  status,
  size = "md",
  showLabel = true,
  className,
}: AppointmentStatusProps) {
  const config = statusConfig[status]

  const sizeConfig = {
    sm: { container: "w-6 h-6", text: "text-xs" },
    md: { container: "w-10 h-10", text: "text-sm" },
    lg: { container: "w-14 h-14", text: "text-base" },
  }

  const sizes = sizeConfig[size]

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          sizes.container,
          config.bgColor,
          config.color,
        )}
      >
        {config.icon}
      </div>
      {showLabel && (
        <div className="text-center">
          <p className={cn("font-semibold text-medical-foreground", sizes.text)}>
            {config.label}
          </p>
          {size === "lg" && (
            <p className="text-xs text-medical-foreground-secondary mt-1">
              {config.description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default AppointmentStatus
