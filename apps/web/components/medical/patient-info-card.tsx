import { cn } from "@acme/shared"
import { User, Mail, Phone, Calendar, MapPin, Heart } from "lucide-react"

interface PatientInfoCardProps {
  fullName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  address?: string
  bloodType?: string
  allergies?: string[]
  emergency?: {
    name: string
    phone: string
  }
  className?: string
}

export function PatientInfoCard({
  fullName,
  email,
  phone,
  dateOfBirth,
  address,
  bloodType,
  allergies,
  emergency,
  className,
}: PatientInfoCardProps) {
  const calculateAge = (dob: string) => {
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  return (
    <div className={cn("medical-card", className)}>
      {/* Patient Name and ID */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-medical-border-light">
        <div className="medical-icon bg-medical-primary-lighter text-medical-primary w-12 h-12">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-medical-foreground">{fullName}</h3>
          {dateOfBirth && (
            <p className="text-sm text-medical-foreground-secondary mt-1">
              {calculateAge(dateOfBirth)} años
            </p>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4 mb-6 pb-6 border-b border-medical-border-light">
        <h4 className="text-sm font-semibold text-medical-foreground-secondary uppercase">
          Información de Contacto
        </h4>
        
        {email && (
          <div className="flex gap-3">
            <Mail className="w-4 h-4 text-medical-primary mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-medical-foreground-secondary">Correo</p>
              <p className="text-sm text-medical-foreground">{email}</p>
            </div>
          </div>
        )}

        {phone && (
          <div className="flex gap-3">
            <Phone className="w-4 h-4 text-medical-primary mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-medical-foreground-secondary">Teléfono</p>
              <p className="text-sm text-medical-foreground">{phone}</p>
            </div>
          </div>
        )}

        {address && (
          <div className="flex gap-3">
            <MapPin className="w-4 h-4 text-medical-primary mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-medical-foreground-secondary">Dirección</p>
              <p className="text-sm text-medical-foreground">{address}</p>
            </div>
          </div>
        )}
      </div>

      {/* Medical Information */}
      <div className="space-y-4">
        {bloodType && (
          <div className="flex items-center gap-4">
            <div className="medical-icon bg-medical-alert-lighter text-medical-alert w-10 h-10">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-medical-foreground-secondary uppercase">
                Tipo de sangre
              </p>
              <p className="text-sm font-bold text-medical-alert mt-1">{bloodType}</p>
            </div>
          </div>
        )}

        {allergies && allergies.length > 0 && (
          <div className="medical-alert-box--alert medical-alert-box">
            <h4 className="text-sm font-semibold mb-2">⚠️ Alergias</h4>
            <div className="flex flex-wrap gap-2">
              {allergies.map((allergy, idx) => (
                <span
                  key={idx}
                  className="inline-block px-3 py-1 bg-medical-alert text-white text-xs font-medium rounded-full"
                >
                  {allergy}
                </span>
              ))}
            </div>
          </div>
        )}

        {emergency && (
          <div className="bg-medical-background-secondary p-4 rounded-lg border-l-4 border-medical-alert">
            <h4 className="text-sm font-semibold text-medical-foreground mb-2">
              Contacto de Emergencia
            </h4>
            <p className="text-sm text-medical-foreground">{emergency.name}</p>
            <p className="text-sm text-medical-foreground-secondary">{emergency.phone}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PatientInfoCard
