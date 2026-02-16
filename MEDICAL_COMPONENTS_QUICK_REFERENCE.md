# Medical Components - Quick Reference

Fast lookup guide for using medical UI components.

---

## 🚀 Import Syntax

```tsx
import {
  MedicalCard,
  AppointmentStatus,
  AppointmentDetails,
  QueueTicket,
  PatientInfoCard,
  MedicalHeader,
} from "@/components/medical"
```

---

## 1️⃣ MedicalCard - Professional Information

**Use when:** Displaying professional/doctor information

```tsx
<MedicalCard
  name="Dr. Juan García"
  specialty="Cardiología"
  licenseNumber="MED-2024-001"
  availability="available"      // "available" | "unavailable" | "busy"
  rating={4.8}                  // 0-5
  experience={15}               // Years
  department="Cardiología"
/>
```

**Best for:**
- Professional directory
- Doctor selection
- Team roster
- Specialist listing

**Props:**
```typescript
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
```

---

## 2️⃣ AppointmentStatus - Status Indicator

**Use when:** Showing appointment/queue status

```tsx
<AppointmentStatus
  status="confirmed"      // scheduled | confirmed | in_progress
                          // completed | cancelled | no_show | pending
  size="md"               // "sm" | "md" | "lg"
  showLabel={true}
/>
```

**Status Options:**
| Status | Color | Meaning |
|--------|-------|---------|
| scheduled | Blue | Booked |
| confirmed | Green | Confirmed |
| in_progress | Blue | Happening |
| completed | Green | Done |
| cancelled | Gray | Cancelled |
| no_show | Red | Didn't show |
| pending | Amber | Awaiting |

**Best for:**
- Appointment badges
- Queue status
- Service status
- Progress indicators

**Props:**
```typescript
interface AppointmentStatusProps {
  status: AppointmentStatus
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}
```

---

## 3️⃣ AppointmentDetails - Full Appointment View

**Use when:** Showing complete appointment information

```tsx
<AppointmentDetails
  id="APT-2024-001"
  date="2024-02-20"
  time="14:30"
  professionalName="Dr. García"
  specialty="Cardiología"
  serviceType="Consulta General"
  roomNumber="101"              // Optional
  notes="Traer documentos"      // Optional
  status="confirmed"
/>
```

**Best for:**
- Appointment confirmation
- Appointment details page
- Booking confirmation
- Appointment view

**Props:**
```typescript
interface AppointmentDetailsProps {
  id: string
  date: string              // ISO format
  time: string              // HH:MM format
  professionalName: string
  specialty: string
  serviceType: string
  roomNumber?: string
  notes?: string
  status: AppointmentStatus
  className?: string
}
```

---

## 4️⃣ QueueTicket - Queue Display

**Use when:** Showing queue/waiting room information

```tsx
<QueueTicket
  ticketCode="T-234"
  ticketNumber={234}
  position={3}
  serviceType="Consultorio de Cardiología"
  status="waiting"            // waiting | called | serving | completed | no_show
  createdAt={new Date().toISOString()}
  estimatedWaitTime={15}      // Optional, in minutes
  currentServingNumber={231}  // Optional
  roomNumber="Sala 3"         // Optional
/>
```

**Status Meanings:**
| Status | Color | Meaning |
|--------|-------|---------|
| waiting | Amber | In queue |
| called | Blue | Called to proceed |
| serving | Green | Being served |
| completed | Green | Done |
| no_show | Red | Didn't show |

**Best for:**
- Waiting room display
- Queue status
- Ticket information
- Wait time display

**Props:**
```typescript
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
```

---

## 5️⃣ PatientInfoCard - Patient Profile

**Use when:** Displaying patient medical information

```tsx
<PatientInfoCard
  fullName="María García López"
  email="maria@example.com"
  phone="+34 912 345 678"
  dateOfBirth="1990-05-15"
  address="Calle Principal 123, Madrid"
  bloodType="O+"
  allergies={["Penicilina", "Sulfamidas"]}
  emergency={{
    name: "Carlos García",
    phone: "+34 987 654 321"
  }}
/>
```

**Best for:**
- Patient profile
- Medical information display
- Patient card
- Check-in information
- Emergency contact

**Props:**
```typescript
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
```

---

## 6️⃣ MedicalHeader - App Header

**Use when:** Creating page header with navigation

```tsx
<MedicalHeader
  userName="María García"
  userRole="patient"            // "patient" | "professional" | "receptionist" | "admin"
  unreadNotifications={3}
  onLogout={() => handleLogout()}
  onNavigate={(route) => router.push(route)}
/>
```

**User Roles:**
| Role | Label | Color |
|------|-------|-------|
| patient | Paciente | Green |
| professional | Profesional | Blue |
| receptionist | Recepcionista | Teal |
| admin | Administrador | Red |

**Best for:**
- App-wide header
- Navigation
- User profile display
- Notifications badge
- Logout button

**Props:**
```typescript
interface MedicalHeaderProps {
  userName: string
  userRole: "patient" | "professional" | "receptionist" | "admin"
  unreadNotifications?: number
  onLogout?: () => void
  onNavigate?: (route: string) => void
  className?: string
}
```

---

## 🎨 CSS Classes Quick Reference

### Colors
```css
.text-medical-primary        /* Primary blue */
.text-medical-success        /* Success green */
.text-medical-warning        /* Warning amber */
.text-medical-alert          /* Alert red */

.bg-medical-primary          /* Primary background */
.bg-medical-success-light    /* Light green bg */
.bg-medical-warning-light    /* Light amber bg */
.bg-medical-alert-light      /* Light red bg */

.border-medical-primary      /* Primary border */
.border-medical-success      /* Success border */
```

### Components
```css
.medical-card                /* Card container */
.medical-badge               /* Badge component */
.medical-badge--success      /* Success badge */
.medical-badge--alert        /* Alert badge */

.medical-icon                /* Icon container */
.medical-icon--success       /* Success icon */

.medical-alert-box           /* Alert box */
.medical-alert-box--success  /* Success alert */
.medical-alert-box--alert    /* Alert (red) alert */

.medical-button              /* Button base */
.medical-button--primary     /* Primary button */
.medical-button--secondary   /* Secondary button */
```

### Status Specific
```css
/* Appointment Status Colors */
.text-medical-status-scheduled    /* Blue */
.text-medical-status-confirmed    /* Green */
.text-medical-status-cancelled    /* Gray */
.text-medical-status-no-show      /* Red */

/* Queue Status Colors */
.text-medical-queue-waiting       /* Amber */
.text-medical-queue-serving       /* Green */
```

---

## 📱 Responsive Classes

```tsx
// Mobile first
<div className="space-y-6">  // Full width mobile

// Tablet and up
<div className="grid grid-cols-1 md:grid-cols-2">
  {/* Single column on mobile, 2 columns on tablet+ */}
</div>

// Desktop layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* 1 col mobile, 2 cols tablet, 3 cols desktop */}
</div>
```

---

## 🌙 Dark Mode

All components automatically work in dark mode. No extra code needed!

```tsx
// Automatic dark mode support
<MedicalCard /* ... */ />  // Works in light AND dark
```

---

## ♿ Accessibility

All components are WCAG AAA compliant:
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ High contrast
- ✅ Focus indicators

No extra work needed!

---

## 💡 Common Patterns

### Patient Dashboard Layout
```tsx
<>
  <MedicalHeader userName="User" userRole="patient" />
  
  <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
    {/* Next Appointment */}
    <section>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <AppointmentDetails {...appointment} />
    </section>

    {/* Queue Info */}
    <section>
      <QueueTicket {...ticket} />
    </section>
  </div>
</>
```

### Professional Directory
```tsx
<>
  <MedicalHeader userName="User" userRole="patient" />
  
  <div className="max-w-6xl mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold mb-8">Profesionales</h1>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {professionals.map(prof => (
        <MedicalCard key={prof.id} {...prof} />
      ))}
    </div>
  </div>
</>
```

### Waiting Room Display
```tsx
<div className="min-h-screen bg-medical-background-secondary">
  <div className="max-w-2xl mx-auto p-8">
    <h1 className="text-4xl font-bold text-center mb-8">
      Tu Turno en Cola
    </h1>
    <QueueTicket {...ticket} />
  </div>
</div>
```

---

## 🔍 Decision Tree

```
What am I displaying?
│
├─ Professional/Doctor info?
│  └─ Use: MedicalCard
│
├─ Appointment status?
│  └─ Use: AppointmentStatus (badge)
│      OR: AppointmentDetails (full view)
│
├─ Queue/Waiting room?
│  └─ Use: QueueTicket
│
├─ Patient profile/information?
│  └─ Use: PatientInfoCard
│
├─ Page header/navigation?
│  └─ Use: MedicalHeader
│
└─ Something else?
   └─ Use standard Tailwind classes
      with medical color utilities
```

---

## 📚 Full Documentation

- **MEDICAL_DESIGN_SYSTEM.md** - Complete guide
- **MEDICAL_UI_UPDATES.md** - Integration steps  
- **DESIGN_IMPROVEMENTS.md** - Before/after
- **DESIGN_SUMMARY.md** - Executive overview

---

## 🚨 Pro Tips

### Always Import Medical Theme
```tsx
// app/layout.tsx
import "@/styles/medical-theme.css"
```

### Use Semantic HTML
```tsx
// Good
<section>
  <h2>Appointments</h2>
  <AppointmentDetails {...} />
</section>

// Less good
<div>
  <div>Appointments</div>
  <AppointmentDetails {...} />
</div>
```

### Use Consistent Spacing
```tsx
// Good
<div className="space-y-6 max-w-4xl mx-auto">
  {/* Content */}
</div>

// Inconsistent
<div className="mb-10 ml-5 mr-3">
  {/* Content */}
</div>
```

### Responsive Grid
```tsx
// Good - responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Content */}
</div>

// Less good - fixed layout
<div className="grid grid-cols-3 gap-4">
  {/* Breaks on mobile */}
</div>
```

---

## ❌ Don't Forget

- ✅ Import medical-theme.css in layout
- ✅ Use MedicalHeader in appropriate layouts
- ✅ Always provide required props
- ✅ Test on mobile devices
- ✅ Use responsive grid classes
- ✅ Test keyboard navigation
- ✅ Test dark mode

---

## 📞 Quick Links

- **Components:** `components/medical/`
- **Styles:** `styles/medical-theme.css`
- **Examples:** Check MEDICAL_UI_UPDATES.md
- **Colors:** Check MEDICAL_DESIGN_SYSTEM.md

---

**Happy building! 🏥**
