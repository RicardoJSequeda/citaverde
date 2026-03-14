import { cn } from "@acme/shared"
import { Badge } from "@acme/ui/badge"
import { Star, Award, Clock } from "lucide-react"

interface MedicalCardProps {
  name: string
  specialty: string
  licenseNumber: string
  availability?: "available" | "unavailable" | "busy"
  rating?: number
  experience?: number
  department?: string
  image?: string
  className?: string
}

export function MedicalCard({
  name,
  specialty,
  licenseNumber,
  availability = "available",
  rating = 5,
  experience = 0,
  department,
  image,
  className,
}: MedicalCardProps) {
  const availabilityConfig = {
    available: {
      color: "bg-medical-success-lighter text-medical-success",
      label: "Disponible",
      dot: "bg-medical-success",
    },
    unavailable: {
      color: "bg-medical-alert-lighter text-medical-alert",
      label: "No disponible",
      dot: "bg-medical-alert",
    },
    busy: {
      color: "bg-medical-warning-lighter text-medical-warning",
      label: "Ocupado",
      dot: "bg-medical-warning",
    },
  }

  const config = availabilityConfig[availability]

  return (
    <div
      className={cn(
        "medical-card group flex flex-col gap-4 p-6",
        "hover:shadow-lg transition-all duration-300",
        className,
      )}
    >
      {/* Header with availability status */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-medical-foreground">{name}</h3>
          <p className="text-sm text-medical-foreground-secondary mt-1">{specialty}</p>
          {department && (
            <p className="text-xs text-medical-neutral-600 mt-2">{department}</p>
          )}
        </div>
        <div className={cn("medical-badge px-3", config.color)}>
          <span className={cn("w-2 h-2 rounded-full", config.dot)}></span>
          {config.label}
        </div>
      </div>

      {/* Professional info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-medical-foreground-secondary">
          <Award className="w-4 h-4 text-medical-primary" />
          <span>Lic. {licenseNumber}</span>
        </div>
        {experience > 0 && (
          <div className="flex items-center gap-2 text-medical-foreground-secondary">
            <Clock className="w-4 h-4 text-medical-primary" />
            <span>{experience} años</span>
          </div>
        )}
      </div>

      {/* Rating */}
      {rating !== undefined && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "w-4 h-4",
                  i < Math.floor(rating)
                    ? "fill-medical-warning text-medical-warning"
                    : "text-medical-neutral-300",
                )}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-medical-foreground">{rating.toFixed(1)}</span>
        </div>
      )}

      {/* CTA Button */}
      <button
        className={cn(
          "medical-button w-full mt-2",
          availability === "available"
            ? "medical-button--primary"
            : "medical-button--secondary opacity-50 cursor-not-allowed",
        )}
        disabled={availability !== "available"}
      >
        {availability === "available" ? "Agendar cita" : "No disponible"}
      </button>
    </div>
  )
}

export default MedicalCard
