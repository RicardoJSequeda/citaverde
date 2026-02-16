# CitaVerde - Scaling Setup Guide

Complete setup guide for implementing the scaled architecture of CitaVerde.

## Prerequisites

- Node.js 18+
- Supabase project
- Redis instance (Upstash recommended for serverless)
- Sentry account (optional but recommended)

## Step 1: Install New Dependencies

```bash
# Install all new dependencies
npm install

# Verify installation
npm list @sentry/nextjs @upstash/redis bull
```

## Step 2: Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your actual values:

### Supabase (Existing)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Redis/Upstash (New)

Option A - Upstash (Recommended for Vercel):
```env
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

Option B - Self-hosted Redis:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

### Sentry (Optional but Recommended)
```env
SENTRY_DSN=https://key@sentry.io/project
NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.io/project
```

## Step 3: Setup Redis

### Option A: Upstash (Easiest)

1. Go to [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy REST URL and Token to `.env.local`

### Option B: Self-hosted Redis

```bash
# Using Docker
docker run --name citaverde-redis -p 6379:6379 -d redis:7-alpine

# Or using Homebrew (macOS)
brew install redis
redis-server
```

## Step 4: Setup Sentry

1. Go to [sentry.io](https://sentry.io)
2. Create a new Next.js project
3. Copy DSN to `.env.local`:
   ```env
   SENTRY_DSN=your-dsn
   NEXT_PUBLIC_SENTRY_DSN=your-dsn
   ```

## Step 5: Verify Supabase RLS Policies

Ensure Row Level Security (RLS) policies are enabled:

```sql
-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('appointments', 'queue_tickets', 'notifications');

-- Enable RLS if needed
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

## Step 6: Start Development Server

```bash
# Install dependencies first if not done
npm install

# Start dev server
npm run dev

# Server will start on http://localhost:3000
```

## Step 7: Test Cache Layer

```typescript
// Test cache in browser console or API route
import { getCached, setCached, cacheKeys } from "@/lib/cache/redis"

// Set cache
await setCached(
  cacheKeys.availableSlots("prof-1", "2024-01-20"),
  ["09:00", "10:00", "11:00"],
  1800
)

// Get cache
const slots = await getCached(
  cacheKeys.availableSlots("prof-1", "2024-01-20")
)
console.log(slots) // ["09:00", "10:00", "11:00"]
```

## Step 8: Test Real-time Subscriptions

```typescript
// In a client component
import { subscribeToQueueUpdates } from "@/lib/realtime/subscriptions"

useEffect(() => {
  const channel = subscribeToQueueUpdates("org-1", (payload) => {
    console.log("Queue updated:", payload)
  })

  return () => unsubscribeFromChannel(channel)
}, [])
```

## Step 9: Setup Notification Workers

For Bull Queue to process notifications:

```bash
# Create a separate worker process
# lib/workers/notification-worker.ts will handle async processing
# Make sure Redis is connected for Bull Queue
```

## Step 10: Verify Sentry Integration

Test error tracking:

```typescript
import { captureException } from "@/lib/monitoring/sentry"

try {
  throw new Error("Test error")
} catch (error) {
  captureException(error as Error)
}
```

Check [sentry.io](https://sentry.io) dashboard to see the error.

## Step 11: Run Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage
```

## Monitoring & Observability

### Performance Monitoring

Check your application performance:
- Sentry Dashboard > Performance > Transactions
- Look for slow endpoints

### Cache Effectiveness

Monitor cache hits/misses:
```bash
# Check Upstash dashboard
# https://console.upstash.com

# Or with Redis CLI
redis-cli
> INFO stats
```

### Error Tracking

Check for errors:
- Sentry Dashboard > Issues
- Filter by domain (appointments, queue, admin, etc.)

## Troubleshooting

### Issue: Redis connection failed

**Solution:** 
- Check UPSTASH_REDIS_REST_URL and token
- Verify Redis is running if self-hosted
- Check network connectivity

### Issue: Sentry events not showing up

**Solution:**
- Verify SENTRY_DSN is correct
- Check `SENTRY_ENVIRONMENT` env var
- Enable debug: `Sentry.init({ debug: true })`

### Issue: Cache not working

**Solution:**
- Clear cache: `redis-cli FLUSHDB`
- Verify Redis connection
- Check cache key patterns

### Issue: Real-time subscriptions not updating

**Solution:**
- Verify Supabase RLS policies
- Check browser console for errors
- Ensure table has realtime enabled:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE queue_tickets;
  ```

### Issue: Notifications not sending

**Solution:**
- Check Bull Queue status
- Verify notification provider credentials
- Check worker process is running
- Look at Sentry for errors

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Environment Variables in Vercel

1. Go to Project Settings > Environment Variables
2. Add all variables from `.env.local`
3. Make sure to add `NEXT_PUBLIC_*` variables

### Production Checklist

- [ ] Redis configured (Upstash)
- [ ] Sentry DSN set
- [ ] Environment variables configured
- [ ] Database backups enabled
- [ ] RLS policies enabled
- [ ] Monitoring alerts setup
- [ ] Error handling tested
- [ ] Cache TTLs tuned

## Performance Optimization

### Cache TTL Recommendations

```typescript
// lib/cache/redis.ts
const CACHE_TTL = {
  APPOINTMENT_SLOTS: 1800,    // 30 minutes
  PROFESSIONAL_SCHEDULE: 3600, // 1 hour
  QUEUE_DATA: 300,             // 5 minutes
  METRICS: 3600,               // 1 hour
}
```

### Adjust based on your usage:
- High frequency changes → Lower TTL
- Low frequency changes → Higher TTL
- Memory constraints → Lower TTL

### Database Index Optimization

```sql
-- Create indexes for frequently queried fields
CREATE INDEX idx_appointments_professional_date 
ON appointments(professional_id, appointment_date);

CREATE INDEX idx_queue_service_status 
ON queue_tickets(service_type_id, status);

CREATE INDEX idx_appointments_patient_id 
ON appointments(patient_id);

CREATE INDEX idx_notifications_user_id 
ON notifications(user_id, read_at);
```

## Next Steps

1. **Test your setup** with a few appointments
2. **Monitor** performance in Sentry
3. **Adjust cache TTLs** based on usage patterns
4. **Setup alerts** for errors and performance issues
5. **Plan for growth** - prepare for 100k+ users

## Support

For issues:
1. Check logs: `npm run dev` and look at console
2. Check Sentry dashboard for errors
3. Check Upstash dashboard for Redis status
4. Review ARCHITECTURE.md for system design

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Upstash Docs](https://upstash.com/docs)
- [Bull Queue Docs](https://docs.bullmq.io/)
- [Sentry Docs](https://docs.sentry.io/)
- [Next.js Docs](https://nextjs.org/docs)
