import { cn } from "@acme/shared"
import { AlertCircle, CheckCircle2, Clock, Users, Zap } from "lucide-react"

type QueueStatus = "waiting" | "called" | "serving" | "completed" | "no_show"

interface QueueTicketProps {
  ticketCode: string
  ticketNumber: number
  position?: number
  serviceType: string
  status: QueueStatus
  createdAt: string
  estimatedWaitTime?: number
  currentServingNumber?: number
  roomNumber?: string
  className?: string
}

const statusConfig: Record<QueueStatus, {
  icon: React.ReactNode
  label: string
  color: string
  bgColor: string
}> = {
  waiting: {
    icon: <Clock className="w-5 h-5" />,
    label: "Esperando",
    color: "text-medical-warning",
    bgColor: "bg-medical-warning-lighter",
  },
  called: {
    icon: <Zap className="w-5 h-5" />,
    label: "Llamado",
    color: "text-medical-info",
    bgColor: "bg-medical-info-lighter",
  },
  serving: {
    icon: <Users className="w-5 h-5" />,
    label: "En atención",
    color: "text-medical-success",
    bgColor: "bg-medical-success-lighter",
  },
  completed: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    label: "Completado",
    color: "text-medical-success",
    bgColor: "bg-medical-success-lighter",
  },
  no_show: {
    icon: <AlertCircle className="w-5 h-5" />,
    label: "No se presentó",
    color: "text-medical-alert",
    bgColor: "bg-medical-alert-lighter",
  },
}

export function QueueTicket({
  ticketCode,
  ticketNumber,
  position,
  serviceType,
  status,
  createdAt,
  estimatedWaitTime,
  currentServingNumber,
  roomNumber,
  className,
}: QueueTicketProps) {
  const config = statusConfig[status]

  const formatTime = (dateString: string) => {
    try {
      const d = new Date(dateString)
      return d.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  const ticketsAhead = currentServingNumber && ticketNumber > currentServingNumber 
    ? ticketNumber - currentServingNumber 
    : 0

  return (
    <div className={cn("medical-card", className)}>
      {/* Header with status */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-medical-foreground-secondary uppercase">
            Turno
          </p>
          <p className="text-2xl font-bold text-medical-primary mt-2">{ticketCode}</p>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm",
          config.bgColor,
          config.color,
        )}>
          {config.icon}
          {config.label}
        </div>
      </div>

      {/* Service and position info */}
      <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-medical-border-light">
        <div>
          <p className="text-xs font-semibold text-medical-foreground-secondary uppercase">
            Servicio
          </p>
          <p className="text-sm font-medium text-medical-foreground mt-2">{serviceType}</p>
        </div>

        {position !== undefined && (
          <div>
            <p className="text-xs font-semibold text-medical-foreground-secondary uppercase">
              Posición
            </p>
            <p className="text-sm font-medium text-medical-foreground mt-2">#{position}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-medical-foreground-secondary uppercase">
            Hora de entrada
          </p>
          <p className="text-sm font-medium text-medical-foreground mt-2">
            {formatTime(createdAt)}
          </p>
        </div>

        {roomNumber && (
          <div>
            <p className="text-xs font-semibold text-medical-foreground-secondary uppercase">
              Sala
            </p>
            <p className="text-sm font-medium text-medical-foreground mt-2">{roomNumber}</p>
          </div>
        )}
      </div>

      {/* Wait time info */}
      {(estimatedWaitTime !== undefined || ticketsAhead > 0) && (
        <div className="medical-alert-box--info medical-alert-box">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 flex-shrink-0" />
            <div>
              {ticketsAhead > 0 && (
                <p className="text-sm font-medium">
                  {ticketsAhead} paciente{ticketsAhead !== 1 ? 's' : ''} en espera
                </p>
              )}
              {estimatedWaitTime !== undefined && (
                <p className="text-sm text-medical-foreground-secondary">
                  Tiempo estimado: {estimatedWaitTime} minutos
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status message */}
      <div className="mt-6 space-y-2">
        <p className="text-sm text-medical-foreground-secondary">
          {status === "waiting" && "Espera a que tu número sea llamado. Verás una notificación cuando sea tu turno."}
          {status === "called" && "¡Tu turno ha sido llamado! Por favor, dirígete a la sala indicada."}
          {status === "serving" && "Actualmente estás siendo atendido. Por favor, permanece en la sala."}
          {status === "completed" && "Tu turno ha sido completado. ¡Gracias por tu visita!"}
          {status === "no_show" && "No se registró tu asistencia a este turno."}
        </p>
      </div>
    </div>
  )
}

export default QueueTicket
