import { cn } from "@/lib/utils"
import { Calendar, Clock, User, MapPin, Phone, FileText } from "lucide-react"
import { AppointmentStatus } from "./appointment-status"

interface AppointmentDetailsProps {
  id: string
  date: string
  time: string
  professionalName: string
  specialty: string
  serviceType: string
  roomNumber?: string
  notes?: string
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show" | "pending"
  className?: string
}

export function AppointmentDetails({
  id,
  date,
  time,
  professionalName,
  specialty,
  serviceType,
  roomNumber,
  notes,
  status,
  className,
}: AppointmentDetailsProps) {
  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString)
      return d.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className={cn("medical-card", className)}>
      {/* Status indicator */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-medical-foreground">Tu cita médica</h3>
          <p className="text-sm text-medical-foreground-secondary mt-1">ID: {id}</p>
        </div>
        <AppointmentStatus status={status} size="md" showLabel={false} />
      </div>

      {/* Main appointment info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-medical-border-light">
        {/* Date and Time */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="medical-icon bg-medical-primary-lighter text-medical-primary">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-medical-foreground-secondary uppercase">
              Fecha
            </p>
            <p className="text-sm font-medium text-medical-foreground mt-1">
              {formatDate(date)}
            </p>
          </div>
        </div>

        {/* Time */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="medical-icon bg-medical-secondary-lighter text-medical-secondary">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-medical-foreground-secondary uppercase">
              Hora
            </p>
            <p className="text-sm font-medium text-medical-foreground mt-1">{time}</p>
          </div>
        </div>

        {/* Professional */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="medical-icon bg-medical-info-lighter text-medical-info">
              <User className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-medical-foreground-secondary uppercase">
              Profesional
            </p>
            <p className="text-sm font-medium text-medical-foreground mt-1">
              {professionalName}
            </p>
            <p className="text-xs text-medical-foreground-secondary mt-1">{specialty}</p>
          </div>
        </div>

        {/* Service Type */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="medical-icon bg-medical-success-lighter text-medical-success">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-medical-foreground-secondary uppercase">
              Servicio
            </p>
            <p className="text-sm font-medium text-medical-foreground mt-1">{serviceType}</p>
          </div>
        </div>
      </div>

      {/* Additional info */}
      {(roomNumber || notes) && (
        <div className="space-y-4">
          {roomNumber && (
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <MapPin className="w-5 h-5 text-medical-primary mt-1" />
              </div>
              <div>
                <p className="text-sm text-medical-foreground-secondary">Sala/Consultorio</p>
                <p className="text-sm font-medium text-medical-foreground">{roomNumber}</p>
              </div>
            </div>
          )}

          {notes && (
            <div className="bg-medical-background-secondary p-4 rounded-lg border-l-4 border-medical-primary">
              <p className="text-xs font-semibold text-medical-foreground-secondary uppercase mb-2">
                Notas
              </p>
              <p className="text-sm text-medical-foreground">{notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Status message */}
      <div className={cn(
        "medical-alert-box mt-6",
        status === "confirmed" ? "medical-alert-box--success" :
        status === "scheduled" ? "medical-alert-box--info" :
        status === "no_show" ? "medical-alert-box--alert" :
        status === "cancelled" ? "medical-alert-box--warning" :
        "medical-alert-box--info"
      )}>
        <p className="text-sm font-medium">
          {status === "confirmed" && "Tu cita ha sido confirmada. Por favor, preséntate 10 minutos antes."}
          {status === "scheduled" && "Tu cita está programada. Puedes cancelarla hasta 24 horas antes."}
          {status === "no_show" && "No te presentaste a esta cita. Por favor, contacta con nosotros."}
          {status === "cancelled" && "Esta cita ha sido cancelada."}
          {status === "completed" && "Esta cita ha sido completada."}
          {status === "in_progress" && "Esta cita está en progreso. Por favor, espera en la sala."}
          {status === "pending" && "Esta cita está pendiente de confirmación."}
        </p>
      </div>
    </div>
  )
}

export default AppointmentDetails
