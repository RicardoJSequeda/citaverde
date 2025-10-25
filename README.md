# Sistema de Gestión de Citas y Turnos Digitales

Sistema completo de gestión de citas médicas y turnos digitales con check-in QR, notificaciones en tiempo real y dashboards administrativos.

## Características Principales

### Para Usuarios
- 📅 **Reserva de Citas Online**: Selecciona servicio, profesional, fecha y hora disponible
- 🎫 **Turnos Digitales**: Obtén un turno digital sin necesidad de fichos físicos
- 📱 **Check-in con QR**: Realiza check-in escaneando el código QR de tu cita
- 🔔 **Notificaciones**: Recibe confirmaciones y recordatorios por email
- 📊 **Dashboard Personal**: Ve todas tus citas y turnos activos

### Para Recepcionistas
- 👥 **Gestión de Cola**: Visualiza y gestiona turnos en espera
- 📞 **Llamar Turnos**: Llama turnos y asigna salas de atención
- ✅ **Completar Atenciones**: Marca turnos como completados o no-show
- 📈 **Estadísticas del Día**: Ve métricas en tiempo real

### Para Administradores
- 🏥 **Gestión de Recursos**: CRUD completo de profesionales, servicios, departamentos y salas
- 📊 **KPIs y Reportes**: Visualiza métricas de rendimiento y estadísticas
- 👨‍⚕️ **Gestión de Profesionales**: Administra horarios y disponibilidad
- 🔐 **Control de Acceso**: Gestión de roles y permisos

## Tecnologías

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js Server Actions, Supabase
- **Base de Datos**: PostgreSQL (Supabase)
- **Autenticación**: Supabase Auth
- **UI Components**: shadcn/ui, Radix UI
- **Notificaciones**: Sistema de notificaciones multi-canal

## Instalación

### 1. Clonar el Repositorio

\`\`\`bash
git clone <repository-url>
cd appointment-booking-system
\`\`\`

### 2. Instalar Dependencias

\`\`\`bash
npm install
\`\`\`

### 3. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Copia las credenciales de tu proyecto
3. Las variables de entorno ya están configuradas en v0

### 4. Ejecutar Scripts SQL

Ejecuta los scripts SQL en orden desde la carpeta `/scripts`:

1. `001_create_tables.sql` - Crea todas las tablas
2. `002_enable_rls.sql` - Configura Row Level Security
3. `003_create_functions.sql` - Crea funciones y triggers
4. `004_seed_data.sql` - Inserta datos iniciales

**En v0**: Los scripts se pueden ejecutar directamente desde la interfaz.

**En Supabase Dashboard**: 
- Ve a SQL Editor
- Copia y pega cada script
- Ejecuta en orden

### 5. Iniciar el Proyecto

\`\`\`bash
npm run dev
\`\`\`

El proyecto estará disponible en `http://localhost:3000`

## Estructura del Proyecto

\`\`\`
appointment-booking-system/
├── app/
│   ├── admin/              # Dashboard administrativo
│   ├── auth/               # Páginas de autenticación
│   ├── check-in/           # Sistema de check-in QR
│   ├── dashboard/          # Dashboard de usuario
│   ├── receptionist/       # Panel de recepcionista
│   └── page.tsx            # Landing page
├── components/
│   ├── admin/              # Componentes de administración
│   ├── ui/                 # Componentes UI (shadcn)
│   └── queue-ticket-card.tsx
├── lib/
│   ├── actions/            # Server Actions
│   │   ├── appointments.ts
│   │   ├── queue.ts
│   │   └── admin.ts
│   └── supabase/           # Clientes Supabase
│       ├── client.ts
│       ├── server.ts
│       └── middleware.ts
└── scripts/                # Scripts SQL
    ├── 001_create_tables.sql
    ├── 002_enable_rls.sql
    ├── 003_create_functions.sql
    └── 004_seed_data.sql
\`\`\`

## Uso del Sistema

### Crear una Cuenta

1. Ve a `/auth/sign-up`
2. Registra tu cuenta con email y contraseña
3. Por defecto, se crea con rol `user`

### Cambiar Roles (Solo para Testing)

Para probar diferentes roles, actualiza manualmente en Supabase:

\`\`\`sql
-- Hacer admin
UPDATE profiles SET role = 'admin' WHERE id = '<user-id>';

-- Hacer recepcionista
UPDATE profiles SET role = 'receptionist' WHERE id = '<user-id>';
\`\`\`

### Flujo de Usuario

1. **Reservar Cita**:
   - Dashboard → "Reservar Cita"
   - Selecciona servicio, profesional, fecha y hora
   - Confirma la reserva

2. **Tomar Turno Digital**:
   - Dashboard → "Tomar Turno"
   - Selecciona el servicio
   - Recibe tu código de turno

3. **Check-in**:
   - El día de la cita, ve a "Mis Citas"
   - Haz clic en la cita
   - Escanea o ingresa el código QR

### Flujo de Recepcionista

1. **Ver Cola de Espera**:
   - Panel muestra turnos en espera y llamados

2. **Llamar Turno**:
   - Selecciona sala de atención
   - Haz clic en "Llamar"
   - El paciente recibe notificación

3. **Completar Atención**:
   - Marca como "Completar" o "No Asistió"

### Flujo de Administrador

1. **Gestionar Recursos**:
   - Admin → "Recursos"
   - Agrega profesionales, servicios, departamentos, salas

2. **Ver Reportes**:
   - Admin → "Reportes"
   - Visualiza KPIs y estadísticas

## Base de Datos

### Tablas Principales

- `profiles` - Perfiles de usuario con roles
- `organizations` - Organizaciones (hospitales/clínicas)
- `departments` - Departamentos médicos
- `service_types` - Tipos de servicios médicos
- `professionals` - Profesionales de salud
- `rooms` - Salas/consultorios
- `schedules` - Horarios de profesionales
- `appointments` - Citas programadas
- `queue_tickets` - Turnos digitales
- `notifications` - Sistema de notificaciones

### Roles y Permisos

- **user**: Puede reservar citas y tomar turnos
- **receptionist**: Puede gestionar la cola de turnos
- **admin**: Acceso completo al sistema

## Server Actions

### Appointments

- `getAvailableSlots()` - Obtiene horarios disponibles
- `createAppointment()` - Crea una nueva cita
- `cancelAppointment()` - Cancela una cita
- `checkInAppointment()` - Realiza check-in con QR

### Queue

- `createQueueTicket()` - Crea un turno digital
- `callQueueTicket()` - Llama un turno
- `completeQueueTicket()` - Completa un turno
- `markQueueTicketNoShow()` - Marca no-show
- `cancelQueueTicket()` - Cancela un turno

### Admin

- `createProfessional()` - Crea profesional
- `createServiceType()` - Crea tipo de servicio
- `createDepartment()` - Crea departamento
- `createRoom()` - Crea sala

## Seguridad

- **Row Level Security (RLS)**: Todas las tablas tienen políticas RLS
- **Autenticación**: Supabase Auth con email/password
- **Validaciones**: Server-side y client-side
- **Roles**: Sistema de roles con permisos granulares

## Próximas Funcionalidades

- [ ] Notificaciones SMS y WhatsApp
- [ ] Actualizaciones en tiempo real con Supabase Realtime
- [ ] Sistema de recordatorios automáticos
- [ ] Reportes avanzados y exportación
- [ ] Integración con calendarios (Google Calendar, Outlook)
- [ ] App móvil nativa
- [ ] Sistema de pagos
- [ ] Historial médico

## Soporte

Para problemas o preguntas:
- Revisa la documentación de [Supabase](https://supabase.com/docs)
- Revisa la documentación de [Next.js](https://nextjs.org/docs)

## Licencia

MIT License
