# Sistema de Gestión de Citas y Turnos Digitales

Sistema completo de gestión de citas médicas y turnos digitales con check-in QR, notificaciones en tiempo real y dashboards administrativos.

## Características Principales

### Para Usuarios
- 📅 **Reserva de Citas Online**: Selecciona servicio, profesional, fecha y hora disponible
- 📲 **Añadir al Calendario**: Añade tus citas a tu calendario personal (Google, Outlook, etc.) con un solo clic.
- 🎫 **Turnos Digitales**: Obtén un turno digital sin necesidad de fichos físicos
- 📱 **Check-in con QR**: Realiza check-in escaneando el código QR de tu cita
- 🔔 **Notificaciones**: Recibe confirmaciones y recordatorios por email, SMS y WhatsApp
- 📊 **Dashboard Personal**: Ve todas tus citas y turnos activos en tiempo real.

### Para Recepcionistas
- 👥 **Gestión de Cola en Tiempo Real**: Visualiza y gestiona turnos en espera y llamados con actualizaciones instantáneas.
- 📞 **Llamar Turnos**: Llama turnos y asigna salas de atención.
- ✅ **Completar Atenciones**: Marca turnos como completados o no-show.
- 📈 **Estadísticas del Día**: Ve métricas en tiempo real.

### Para Administradores
- 🏥 **Gestión de Recursos**: CRUD completo de profesionales, servicios, departamentos y salas
- 📊 **KPIs y Reportes Avanzados**: Filtra por fecha, exporta a CSV y visualiza métricas clave y gráficos de rendimiento.
- 👨‍⚕️ **Gestión de Profesionales**: Administra horarios y disponibilidad
- 🔐 **Control de Acceso**: Gestión de roles y permisos

## Tecnologías

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js Server Actions, Supabase
- **Base de Datos**: PostgreSQL (Supabase), pg_cron
- **Realtime**: Supabase Realtime
- **Autenticación**: Supabase Auth
- **UI Components**: shadcn/ui, Radix UI, Recharts
- **Notificaciones**: Sistema de notificaciones multi-canal (Email, SMS, WhatsApp con Twilio)
- **Calendar**: iCalendar (`.ics`) generation

## Instalación

(La instalación no ha cambiado)

## Próximas Funcionalidades

- [x] Notificaciones SMS y WhatsApp
- [x] Actualizaciones en tiempo real con Supabase Realtime
- [x] Reportes avanzados y exportación
- [x] Sistema de recordatorios automáticos
- [x] Integración con calendarios (Google Calendar, Outlook)
- [ ] App móvil nativa
- [ ] Sistema de pagos
- [ ] Historial médico

## Licencia

MIT License
