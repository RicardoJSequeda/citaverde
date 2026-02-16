# CitaVerde - Scaled Architecture Documentation

## Overview

This document describes the refactored architecture of CitaVerde following domain-driven design principles and optimization for scalability.

## Architecture Evolution

### Current Phase: Optimized Monolith (0-100k users)

```
┌─────────────────────────────────────────┐
│     Next.js Frontend + API (SSR)        │
│  (React + TypeScript + Tailwind)        │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼─────┐        ┌─────▼────┐
   │ Redis    │        │ Supabase │
   │ Cache    │        │ (DB+Auth)│
   └──────────┘        └──────────┘
        │                     │
   ┌────▼──────────────────────▼────┐
   │  Bull Queue (Notifications)    │
   │  Async Workers                 │
   └────────────────────────────────┘
```

## Project Structure

```
lib/
├── cache/
│   └── redis.ts                    # Redis cache helpers
├── monitoring/
│   └── sentry.ts                   # Error tracking & monitoring
├── realtime/
│   └── subscriptions.ts            # Supabase Realtime subscriptions
├── workers/
│   └── notification-worker.ts      # Async notification processing
├── domains/
│   ├── appointments/
│   │   ├── actions.ts              # Server Actions
│   │   └── services.ts             # Business logic
│   ├── queue/
│   │   ├── actions.ts              # Server Actions
│   │   └── services.ts             # Business logic
│   ├── admin/
│   │   └── actions.ts              # Admin operations
│   └── notifications/
│       └── actions.ts              # Notification management
├── supabase/
│   ├── client.ts                   # Client initialization
│   ├── server.ts                   # Server initialization
│   └── middleware.ts               # Auth middleware
└── utils.ts                        # Shared utilities
```

## Domain Architecture

### 1. Appointments Domain

**Responsibilities:**
- Schedule management
- Appointment booking & cancellation
- Check-in with QR codes
- Rescheduling & availability calculation
- Rating & feedback

**Features:**
- Redis caching for available slots (TTL: 30 min)
- Automatic cache invalidation on changes
- Async notifications

**Files:**
- `lib/domains/appointments/services.ts` - Business logic
- `lib/domains/appointments/actions.ts` - Server Actions

### 2. Queue Domain

**Responsibilities:**
- Digital ticket management
- Queue position tracking
- Wait time estimation
- Ticket transfer & cancellation
- No-show tracking

**Features:**
- Real-time updates via Supabase Realtime
- Cache invalidation strategies
- Position calculation

**Files:**
- `lib/domains/queue/services.ts` - Business logic
- `lib/domains/queue/actions.ts` - Server Actions

### 3. Admin Domain

**Responsibilities:**
- Professional management
- Service type configuration
- Resource management (rooms, schedules)
- Queue management (open/close)
- Performance reporting

**Files:**
- `lib/domains/admin/actions.ts` - Admin operations

### 4. Notifications Domain

**Responsibilities:**
- Notification queuing
- User notification management
- Bulk messaging
- Read status tracking

**Features:**
- Async processing via Bull Queue
- Multiple channels (email, SMS, push)
- Retry logic with exponential backoff

**Files:**
- `lib/domains/notifications/actions.ts` - Notification API
- `lib/workers/notification-worker.ts` - Async processor

## Technologies & Libraries

### Core
- **Framework:** Next.js 15.5.4
- **Runtime:** Node.js 18+
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth

### Scaling & Performance
- **Cache:** Upstash Redis (serverless)
- **Real-time:** Supabase Realtime
- **Job Queue:** Bull
- **Monitoring:** Sentry

### UI
- **React:** 19.1.0
- **Styling:** Tailwind CSS + shadcn/ui
- **Form Handling:** React Hook Form + Zod

## Implementation Guide

### 1. Setup Redis Cache

```typescript
import { getCached, setCached } from "@/lib/cache/redis"

// Get from cache
const slots = await getCached(cacheKey)

// Set cache with TTL
await setCached(cacheKey, slots, 1800) // 30 minutes

// Invalidate on changes
await invalidateCachePattern(`slots:${professionalId}:*`)
```

### 2. Implement Real-time Updates

```typescript
import { subscribeToQueueUpdates } from "@/lib/realtime/subscriptions"

useEffect(() => {
  const channel = subscribeToQueueUpdates(orgId, (payload) => {
    // Handle queue update
  })

  return () => unsubscribeFromChannel(channel)
}, [])
```

### 3. Queue Async Notifications

```typescript
// Notifications are automatically queued from service actions
await supabase.from("notifications").insert({
  user_id: userId,
  type: "appointment_confirmation",
  channel: "email",
  subject: "Appointment Confirmed",
  message: "...",
  status: "pending", // Bull worker will process
})
```

### 4. Monitor with Sentry

```typescript
import { captureException, trackAppointmentEvent } from "@/lib/monitoring/sentry"

try {
  // Your code
  trackAppointmentEvent("create", appointmentId)
} catch (error) {
  captureException(error, { appointmentId })
}
```

## Environment Variables

Required for scaling:

```env
# Upstash Redis
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Sentry
SENTRY_DSN=...

# Optional notification providers
SENDGRID_API_KEY=...
TWILIO_ACCOUNT_SID=...
```

See `.env.example` for complete list.

## Performance Optimization

### Caching Strategy

| Resource | Cache Key Pattern | TTL | Invalidation |
|----------|------------------|-----|--------------|
| Appointment Slots | `slots:{professionalId}:{date}` | 30 min | On appointment change |
| Professional Schedule | `schedule:{professionalId}` | 1 hour | On schedule update |
| Queue Active | `queue:active:{serviceTypeId}` | 5 min | On ticket status change |
| Service Stats | `service:stats:{serviceTypeId}` | 1 hour | Nightly |

### Realtime Subscriptions

- Queue updates via Supabase Realtime
- Appointment changes via Realtime
- Notification delivery via Bull Queue

### Database Queries

- Row-level security (RLS) enabled
- Indexes on frequently queried fields
- Connection pooling via Supabase

## Future Roadmap

### Microservices Phase (100k+ users)

```
API Gateway
├── Appointment Service (Node.js + Hono)
├── Queue Service (Node.js + Socket.io)
├── Notification Service (Workers)
└── Admin Service (Node.js)
```

### Additional Optimizations

- [ ] Separate read replicas for reporting
- [ ] GraphQL API layer
- [ ] WebSocket for real-time queue
- [ ] Message queue (RabbitMQ)
- [ ] CQRS pattern for events
- [ ] Event sourcing for audit trail

## Monitoring & Observability

### Sentry Tracking

- Unhandled exceptions
- Performance transactions
- Custom breadcrumbs for domain events
- User context tracking

### Key Metrics to Monitor

- Cache hit rate
- Queue processing time
- Notification delivery rate
- API response times
- Database query performance

## Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
- Test service functions with Supabase
- Test cache invalidation
- Test queue processing

### Load Testing
- Monitor performance with 1000+ concurrent users
- Test cache effectiveness
- Verify queue throughput

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Dependencies handled automatically:
- Next.js deployment
- Environment variables
- Cron jobs for cleanup

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "start"]
```

## Support & Troubleshooting

### Common Issues

1. **Cache misses increasing**: Check TTL values
2. **Slow appointment queries**: Verify schedule indexes
3. **Notification delays**: Check Bull queue status
4. **Realtime not updating**: Verify Supabase RLS policies

### Debugging

Enable detailed logging:
```typescript
process.env.DEBUG = "citaverde:*"
```

Monitor with Sentry dashboard for errors and performance issues.

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Scaling Guide](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Bull Queue Documentation](https://docs.bullmq.io/)
- [Sentry Documentation](https://docs.sentry.io/)
