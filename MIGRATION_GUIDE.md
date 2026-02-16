# Migration Guide: Old Structure to New Domain Architecture

## Overview

This guide helps you migrate existing components from the old `lib/actions/` structure to the new domain-based architecture.

## File Mapping

### Old Structure → New Structure

```
OLD                          NEW
lib/actions/
├── appointments.ts      →   lib/domains/appointments/
│                            ├── services.ts (logic)
│                            └── actions.ts (server actions)
├── queue.ts             →   lib/domains/queue/
│                            ├── services.ts (logic)
│                            └── actions.ts (server actions)
├── admin.ts             →   lib/domains/admin/
│                            └── actions.ts
└── receptionist.ts      →   lib/domains/queue/actions.ts + admin/actions.ts
```

## Migration Steps

### Step 1: Update Imports in Components

**Before:**
```typescript
import { createAppointment, getAvailableSlots } from "@/lib/actions/appointments"
import { createQueueTicket, callQueueTicket } from "@/lib/actions/queue"
```

**After:**
```typescript
import { 
  createAppointment, 
  getAvailableSlots 
} from "@/lib/domains/appointments/actions"

import { 
  createQueueTicket, 
  callQueueTicket 
} from "@/lib/domains/queue/actions"
```

### Step 2: Use Cached Data

**Before:**
```typescript
// Direct database queries without caching
const slots = await getAvailableSlots(professionalId, date, serviceTypeId)
```

**After:**
```typescript
// Automatically uses Redis cache
// Cache is handled transparently in services
const slots = await getAvailableSlots(professionalId, date, serviceTypeId)
// Cache key: slots:{professionalId}:{date}
// TTL: 30 minutes (automatic invalidation on changes)
```

### Step 3: Add Monitoring

**Before:**
```typescript
try {
  await createAppointment(formData)
} catch (error) {
  console.error(error)
}
```

**After:**
```typescript
import { trackAppointmentEvent } from "@/lib/monitoring/sentry"

try {
  const result = await createAppointment(formData)
  if (result.success) {
    trackAppointmentEvent("create", result.appointment.id)
  }
} catch (error) {
  captureException(error, { appointmentId: formData.serviceTypeId })
}
```

### Step 4: Implement Real-time Updates

**Before:**
```typescript
// Manual polling or no real-time updates
setInterval(() => {
  getQueuePosition(ticketId)
}, 5000)
```

**After:**
```typescript
import { subscribeToQueueUpdates } from "@/lib/realtime/subscriptions"

useEffect(() => {
  const channel = subscribeToQueueUpdates(organizationId, (payload) => {
    // Update queue UI automatically
    updateQueueDisplay(payload.new)
  })

  return () => unsubscribeFromChannel(channel)
}, [organizationId])
```

### Step 5: Use Async Notifications

**Before:**
```typescript
// Notifications sent synchronously (slow)
await sendEmailNotification(userId, subject, message)
```

**After:**
```typescript
// Notifications queued asynchronously (fast)
await supabase.from("notifications").insert({
  user_id: userId,
  type: "appointment_confirmation",
  channel: "email",
  subject,
  message,
  status: "pending", // Bull worker processes async
})
```

## Detailed Changes

### Appointments Domain

#### Service Functions (New Separation)

Business logic moved to `services.ts`:
- `getAvailableSlots()` - with caching
- `createAppointmentService()` - with cache invalidation
- `cancelAppointmentService()` - with notifications
- `checkInAppointmentService()` - with verification
- `rescheduleAppointmentService()` - with availability check
- `reissueQRCodeService()` - with notification
- `rateAppointmentService()` - rating collection

#### Server Actions (Thin Layer)

Server actions in `actions.ts` now:
1. Get authenticated user
2. Call service function
3. Revalidate cache on success
4. Return result

**Example:**
```typescript
export async function createAppointment(formData) {
  const user = await getUser()
  const result = await createAppointmentService(user.id, formData)
  if (result.success) revalidatePath("/dashboard")
  return result
}
```

### Queue Domain

#### Changes
- Added real-time subscription support
- Cache invalidation on ticket status changes
- Position calculation optimized with indexing
- Async notifications for queue events

#### New Features
- `getQueuePositionService()` - with queue counting
- `transferQueueTicketService()` - multi-queue support
- Cache patterns: `queue:active:{serviceTypeId}`

### Admin Domain

#### Changes
- Extracted from receptionist.ts
- Added professional schedule invalidation
- Service type cache management
- Performance metrics isolated

### Notifications Domain

#### New Structure
- Async processing via Bull Queue
- Multiple channels (email, SMS, push)
- Retry logic with exponential backoff
- Status tracking (pending → sending → sent/failed)

#### Worker Processing
```typescript
// Handled by lib/workers/notification-worker.ts
// Automatically processes pending notifications
notificationQueue.process(async (job) => {
  // Send via provider
  // Update status
})
```

## Component Updates

### Appointment Booking Component

**Before:**
```tsx
const AppointmentForm = () => {
  const [slots, setSlots] = useState([])
  
  useEffect(() => {
    getAvailableSlots(profId, date, serviceId).then(setSlots)
  }, [profId, date, serviceId])
  
  return // Form JSX
}
```

**After:**
```tsx
import { getAvailableSlots } from "@/lib/domains/appointments/actions"
import { trackAppointmentEvent } from "@/lib/monitoring/sentry"

const AppointmentForm = () => {
  const [slots, setSlots] = useState([])
  
  useEffect(() => {
    // Automatically cached for 30 minutes
    getAvailableSlots(profId, date, serviceId).then((result) => {
      if (result.slots) setSlots(result.slots)
    })
  }, [profId, date, serviceId])
  
  const handleSubmit = async (formData) => {
    const result = await createAppointment(formData)
    if (result.success) {
      trackAppointmentEvent("create", result.appointment.id)
    }
  }
  
  return // Form JSX
}
```

### Queue Display Component

**Before:**
```tsx
const QueueDisplay = ({ organizationId }) => {
  const [tickets, setTickets] = useState([])
  
  // Manual polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueue(organizationId).then(setTickets)
    }, 5000)
    return () => clearInterval(interval)
  }, [organizationId])
}
```

**After:**
```tsx
import { subscribeToQueueUpdates } from "@/lib/realtime/subscriptions"

const QueueDisplay = ({ organizationId }) => {
  const [tickets, setTickets] = useState([])
  
  // Real-time updates via Supabase
  useEffect(() => {
    const channel = subscribeToQueueUpdates(organizationId, (payload) => {
      setTickets((prev) => {
        if (payload.eventType === "INSERT") return [...prev, payload.new]
        if (payload.eventType === "UPDATE") {
          return prev.map((t) => t.id === payload.new.id ? payload.new : t)
        }
        return prev
      })
    })
    
    return () => unsubscribeFromChannel(channel)
  }, [organizationId])
}
```

## Testing Updates

### Old Tests
```typescript
// Testing direct service calls
test("should get available slots", async () => {
  const slots = await getAvailableSlots(profId, date, serviceId)
  expect(slots.length).toBeGreaterThan(0)
})
```

### New Tests
```typescript
import * as appointmentService from "@/lib/domains/appointments/services"

test("should cache available slots", async () => {
  const slots = await appointmentService.getAvailableSlots(profId, date, serviceId)
  
  // Verify cache was set
  const cached = await getCached(cacheKeys.availableSlots(profId, date))
  expect(cached).toEqual(slots)
})

test("should invalidate cache on appointment creation", async () => {
  await appointmentService.createAppointmentService(userId, formData)
  
  // Verify cache was cleared
  const cached = await getCached(cacheKeys.availableSlots(profId, "*"))
  expect(cached).toBeNull()
})
```

## Deployment

### No Breaking Changes
- Old imports still work for now (can be deprecated)
- New domain structure runs in parallel
- Gradual migration possible

### Migration Path
1. Update critical components first (main user flows)
2. Add monitoring to critical paths
3. Test real-time subscriptions
4. Roll out caching benefits
5. Deprecate old structure

## Checklist

- [ ] Update component imports to new domains
- [ ] Test appointment booking with cache
- [ ] Verify real-time queue updates
- [ ] Configure Sentry monitoring
- [ ] Setup Redis (Upstash or self-hosted)
- [ ] Test async notifications
- [ ] Update environment variables
- [ ] Run full test suite
- [ ] Deploy to staging
- [ ] Monitor Sentry dashboard
- [ ] Deploy to production

## Support

For issues during migration:
1. Check component imports
2. Verify Redis connection
3. Check Sentry for errors
4. Review ARCHITECTURE.md
5. See SETUP_SCALING.md for troubleshooting
