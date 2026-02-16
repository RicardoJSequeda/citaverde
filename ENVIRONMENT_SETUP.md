# Environment Variables Setup Guide

## Overview

This guide walks you through setting up all required environment variables for production deployment.

## Step 1: Create `.env.local` File

```bash
# Copy example to local
cp .env.example .env.local

# Edit the file
nano .env.local  # or use your preferred editor
```

---

## Step 2: Configure Each Variable

### SUPABASE Configuration

#### 1. `NEXT_PUBLIC_SUPABASE_URL`
**What it is:** Your Supabase project URL

**Where to find it:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "Settings" → "API"
4. Copy "Project URL"

**Format:**
```
https://your-project-id.supabase.co
```

**Add to `.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
```

#### 2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**What it is:** Public API key for client-side operations with RLS

**Where to find it:**
1. Supabase Dashboard → Settings → API
2. Copy "anon public" key

**Add to `.env.local`:**
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ IMPORTANT:** 
- This key is PUBLIC (can be exposed in browser)
- Use only for user operations (with RLS)
- Never use for admin operations

#### 3. `SUPABASE_SERVICE_ROLE_KEY`
**What it is:** Secret key for server-side admin operations (KEEP SECRET!)

**Where to find it:**
1. Supabase Dashboard → Settings → API
2. Copy "service_role secret" key

**Add to `.env.local`:**
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ CRITICAL:**
- Keep this completely secret
- Never commit to git
- Never expose in client code
- Only use in server-side operations

---

### UPSTASH Redis Configuration

#### 4. `UPSTASH_REDIS_REST_URL`
**What it is:** Serverless Redis REST endpoint URL

**Where to find it:**
1. Go to https://console.upstash.com
2. Click on your Redis database
3. Copy REST URL

**Add to `.env.local`:**
```
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
```

#### 5. `UPSTASH_REDIS_REST_TOKEN`
**What it is:** Authentication token for Redis REST API

**Where to find it:**
1. Upstash Console → Your database
2. Copy REST Token

**Add to `.env.local`:**
```
UPSTASH_REDIS_REST_TOKEN=AXVwYXN0Yk...
```

**⚠️ IMPORTANT:**
- Keep this secret
- This is used for caching and rate limiting
- Never expose in client code

---

### UPSTASH QStash Configuration (Job Queue)

#### 6. `QSTASH_TOKEN`
**What it is:** API token for Upstash QStash (serverless job queue)

**Where to find it:**
1. Go to https://console.upstash.com
2. Click on QStash
3. Copy your API token

**Add to `.env.local`:**
```
QSTASH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

**⚠️ IMPORTANT:**
- Keep this secret
- Used for async notification processing
- Never expose in client code

#### 7. `QSTASH_CURRENT_SIGNING_KEY` (Optional but Recommended)
**What it is:** Current key for verifying webhook signatures

**Where to find it:**
1. Upstash Console → QStash
2. Look for signing keys section

**Add to `.env.local`:**
```
QSTASH_CURRENT_SIGNING_KEY=sig_xxx
```

#### 8. `QSTASH_NEXT_SIGNING_KEY` (Optional but Recommended)
**What it is:** Next key for key rotation

**Add to `.env.local`:**
```
QSTASH_NEXT_SIGNING_KEY=sig_yyy
```

---

### Sentry Configuration (Error Tracking)

#### 9. `SENTRY_DSN`
**What it is:** Server-side error tracking URL

**Where to find it:**
1. Go to https://sentry.io/dashboard
2. Create a new Next.js project (if needed)
3. Copy DSN from "Settings" → "Client Keys"

**Add to `.env.local`:**
```
SENTRY_DSN=https://examplePublicKey@sentry.io/exampleProjectId
```

#### 10. `NEXT_PUBLIC_SENTRY_DSN`
**What it is:** Client-side error tracking URL (same as above)

**Add to `.env.local`:**
```
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@sentry.io/exampleProjectId
```

#### 11. `SENTRY_AUTH_TOKEN` (Optional)
**What it is:** Token for Sentry CLI operations

**Where to find it:**
1. Sentry → Settings → Auth Tokens
2. Create new token

**Add to `.env.local`:**
```
SENTRY_AUTH_TOKEN=sntrys_xxxxx
```

---

### Optional: Notification Providers

These are only needed if you're implementing email/SMS notifications:

#### Email (Choose One)

**Option A: Resend**
```
RESEND_API_KEY=re_xxxxx
```

**Option B: SendGrid**
```
SENDGRID_API_KEY=SG.xxxxx
```

**Option C: Mailgun**
```
MAILGUN_API_KEY=key-xxxxx
MAILGUN_DOMAIN=mail.yourdomain.com
```

#### SMS (Choose One)

**Option A: Twilio**
```
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

**Option B: AWS SNS**
```
AWS_SNS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
```

#### Push Notifications (Choose One)

**Option A: Firebase**
```
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nxxxxx
FIREBASE_CLIENT_EMAIL=xxxxx@xxxxx.iam.gserviceaccount.com
```

**Option B: OneSignal**
```
ONESIGNAL_APP_ID=xxxxx
ONESIGNAL_API_KEY=xxxxx
```

---

### Optional: Deployment & URLs

#### 12. `NEXT_PUBLIC_APP_URL`
**What it is:** Your application's public URL

**Add to `.env.local`:**
```
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Development
# or
NEXT_PUBLIC_APP_URL=https://yourdomain.com  # Production
```

#### 13. `VERCEL_URL`
**What it is:** Auto-set by Vercel in production

**In Vercel Dashboard:**
- Automatically configured
- No need to set manually

---

## Step 3: Final `.env.local` Template

```bash
# ==================== SUPABASE ====================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# ==================== UPSTASH REDIS ====================
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXVw...

# ==================== UPSTASH QSTASH ====================
QSTASH_TOKEN=eyJhbGc...
QSTASH_CURRENT_SIGNING_KEY=sig_xxx
QSTASH_NEXT_SIGNING_KEY=sig_yyy

# ==================== SENTRY ====================
SENTRY_DSN=https://key@sentry.io/project
NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.io/project

# ==================== APP URLs ====================
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==================== NODE ENV ====================
NODE_ENV=development
```

---

## Step 4: Verify Configuration

### Test Supabase Connection
```bash
npx supabase projects list
```

### Test Redis Connection
```bash
# In Node.js console
node -e "
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
redis.ping().then(console.log).catch(console.error);
"
```

### Test QStash Connection
```bash
# In Node.js console
node -e "
const { Client } = require('@upstash/qstash');
const qstash = new Client({ token: process.env.QSTASH_TOKEN });
qstash.api.messages.list().then(console.log).catch(console.error);
"
```

---

## Step 5: Database Setup

### Create DLQ Table
1. Go to Supabase Dashboard
2. Click "SQL Editor"
3. Click "New Query"
4. Copy and paste content from `scripts/01_create_dlq_table.sql`
5. Click "Run"

### Enable RLS
1. In SQL Editor, click "New Query"
2. Copy and paste content from `scripts/02_enable_rls.sql`
3. Click "Run"

**Verify RLS is enabled:**
```sql
SELECT schemaname, tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

---

## Step 6: Deploy to Vercel

### Add Environment Variables to Vercel

1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Settings" → "Environment Variables"
4. Add each variable:

```
NEXT_PUBLIC_SUPABASE_URL: [paste value]
NEXT_PUBLIC_SUPABASE_ANON_KEY: [paste value]
SUPABASE_SERVICE_ROLE_KEY: [paste value] ⚠️ MARKED AS SECRET
UPSTASH_REDIS_REST_URL: [paste value]
UPSTASH_REDIS_REST_TOKEN: [paste value] ⚠️ MARKED AS SECRET
QSTASH_TOKEN: [paste value] ⚠️ MARKED AS SECRET
SENTRY_DSN: [paste value]
NEXT_PUBLIC_SENTRY_DSN: [paste value]
```

5. For sensitive values, mark as "Sensitive"
6. Click "Save"

### Deploy
```bash
vercel deploy --prod
```

---

## Security Best Practices

### ✅ DO
- ✅ Keep `.env.local` in `.gitignore`
- ✅ Use different keys for dev and production
- ✅ Rotate secrets regularly
- ✅ Mark sensitive variables as "Sensitive" in Vercel
- ✅ Use service role key only on server
- ✅ Monitor Sentry for security errors

### ❌ DON'T
- ❌ Commit `.env.local` to git
- ❌ Share env vars in Slack/Email
- ❌ Use service role key in client
- ❌ Log sensitive values
- ❌ Use same keys for dev and prod
- ❌ Expose public URLs in error messages

---

## Troubleshooting

### Issue: "NEXT_PUBLIC_SUPABASE_URL is not configured"
**Solution:**
- Check `.env.local` file exists
- Verify `NEXT_PUBLIC_SUPABASE_URL` is set correctly
- Restart dev server: `npm run dev`

### Issue: Redis connection failed
**Solution:**
- Verify `UPSTASH_REDIS_REST_URL` is correct
- Verify `UPSTASH_REDIS_REST_TOKEN` is correct
- Check Upstash dashboard that DB is active
- Test connection with curl:
  ```bash
  curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" $UPSTASH_REDIS_REST_URL/ping
  ```

### Issue: QStash webhook not working
**Solution:**
- Verify `QSTASH_TOKEN` is correct
- Check webhook URL in QStash console
- Verify signing keys match
- Check Sentry for errors

### Issue: Sentry not capturing errors
**Solution:**
- Verify `SENTRY_DSN` is correct
- Check Sentry project is active
- Verify environment is not set to "production" in dev
- Check browser console for Sentry errors

---

## Resources

- [Supabase Setup](https://supabase.com/docs/guides/getting-started)
- [Upstash Redis Docs](https://upstash.com/docs/redis/features/rest-api)
- [QStash Documentation](https://upstash.com/docs/qstash/getting-started)
- [Sentry Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

---

## Next Steps

1. ✅ Configure all environment variables
2. ✅ Create DLQ table in Supabase
3. ✅ Enable RLS on all tables
4. ✅ Test connections
5. ✅ Run dev server: `npm run dev`
6. ✅ Deploy to Vercel

Your application is now ready for production! 🚀
