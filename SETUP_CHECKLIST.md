# Production Setup Checklist

Complete this checklist to ensure your application is ready for production.

---

## Phase 1: Installation & Dependencies

- [ ] **1.1** Clean install of dependencies
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

- [ ] **1.2** Verify all dependencies installed
  ```bash
  npm ls
  ```

- [ ] **1.3** Build application
  ```bash
  npm run build
  ```

---

## Phase 2: Supabase Configuration

- [ ] **2.1** Create Supabase project (if not exists)
  - Go to https://supabase.com/dashboard
  - Click "New Project"
  - Name it (e.g., "CitaVerde-Prod")
  - Copy Project URL and Anon Key

- [ ] **2.2** Create DLQ table
  ```bash
  # In Supabase SQL Editor:
  # Copy content from scripts/01_create_dlq_table.sql
  # Run the query
  ```
  
  **Verify:**
  ```sql
  SELECT * FROM notification_dead_letter_queue LIMIT 1;
  ```

- [ ] **2.3** Enable RLS on all tables
  ```bash
  # In Supabase SQL Editor:
  # Copy content from scripts/02_enable_rls.sql
  # Run the query
  ```
  
  **Verify:**
  ```sql
  SELECT schemaname, tablename, rowsecurity FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = true;
  ```

- [ ] **2.4** Create auth users for testing
  ```bash
  # In Supabase Auth tab:
  # Create at least 2 test users:
  # - user@example.com (password: test123)
  # - admin@example.com (password: test123)
  ```

- [ ] **2.5** Verify JWT secrets
  ```bash
  # In Supabase Settings > API:
  # Copy JWT Secret and verify ANON_KEY is different from SERVICE_ROLE_KEY
  ```

---

## Phase 3: External Services Setup

### 3.1 Upstash Redis

- [ ] **3.1.1** Create Redis database
  - Go to https://console.upstash.com
  - Click "Create Database"
  - Select "Global" for best performance
  - Copy REST URL and Token

- [ ] **3.1.2** Test Redis connection
  ```bash
  curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
    "$UPSTASH_REDIS_REST_URL/ping"
  # Should return: {"result":"PONG"}
  ```

### 3.2 Upstash QStash

- [ ] **3.2.1** Create QStash API token
  - Go to https://console.upstash.com
  - Click on "QStash"
  - Copy your API Token
  - Copy Signing Keys

- [ ] **3.2.2** Test QStash connection
  ```bash
  curl -H "Authorization: Bearer $QSTASH_TOKEN" \
    "https://qstash.upstash.io/v2/messages"
  ```

### 3.3 Sentry

- [ ] **3.3.1** Create Sentry project
  - Go to https://sentry.io/dashboard
  - Click "Create Project"
  - Select "Next.js"
  - Copy DSN

- [ ] **3.3.2** Verify Sentry project settings
  - Check "Release Tracking" is enabled
  - Setup alerts (optional)
  - Add team members (optional)

### 3.4 Email Provider (Choose One)

- [ ] **3.4.1** Setup email provider
  - **Resend:** https://resend.com → Copy API Key
  - **SendGrid:** https://sendgrid.com → Copy API Key
  - **Mailgun:** https://mailgun.com → Copy API Key

---

## Phase 4: Environment Variables

- [ ] **4.1** Create `.env.local` file
  ```bash
  cp .env.example .env.local
  ```

- [ ] **4.2** Fill in Supabase variables
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
  ```

- [ ] **4.3** Fill in Upstash variables
  ```bash
  UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
  UPSTASH_REDIS_REST_TOKEN=AXVw...
  QSTASH_TOKEN=eyJhbGc...
  QSTASH_CURRENT_SIGNING_KEY=sig_xxx
  QSTASH_NEXT_SIGNING_KEY=sig_yyy
  ```

- [ ] **4.4** Fill in Sentry variables
  ```bash
  SENTRY_DSN=https://key@sentry.io/project
  NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.io/project
  SENTRY_AUTH_TOKEN=sntrys_xxxxx
  ```

- [ ] **4.5** Fill in application URL
  ```bash
  NEXT_PUBLIC_APP_URL=http://localhost:3000  # Dev
  # or
  NEXT_PUBLIC_APP_URL=https://yourdomain.com  # Prod
  ```

- [ ] **4.6** Verify all variables are set
  ```bash
  grep -E "^[A-Z_]+=.+$" .env.local | wc -l
  # Should show 10+ lines
  ```

---

## Phase 5: Local Testing

- [ ] **5.1** Start development server
  ```bash
  npm run dev
  ```
  
  **Expected:** Server runs on http://localhost:3000

- [ ] **5.2** Test homepage
  - Navigate to http://localhost:3000
  - Should see landing page (no errors)

- [ ] **5.3** Test authentication
  - Click "Sign Up"
  - Create account with email/password
  - Should redirect to dashboard

- [ ] **5.4** Test rate limiting
  ```bash
  # In browser console:
  # Try to create 10 appointments in 1 minute
  # Should fail after 5th with "Too many requests"
  ```

- [ ] **5.5** Test idempotency
  ```bash
  # Create appointment
  # Retry same request
  # Should return same appointment (not create 2)
  ```

- [ ] **5.6** Check Sentry
  - Navigate to http://localhost:3000/test-error
  - Should see error in Sentry dashboard in 30 seconds

- [ ] **5.7** Check Redis cache
  ```bash
  curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
    "$UPSTASH_REDIS_REST_URL/keys/*" 
  # Should see cache keys starting with "slots:", "queue:", etc.
  ```

---

## Phase 6: Database Integrity

- [ ] **6.1** Verify RLS policies
  ```sql
  SELECT * FROM pg_policies
  WHERE tablename IN ('appointments', 'queue_tickets', 'notifications');
  ```
  
  **Expected:** 20+ policies shown

- [ ] **6.2** Test RLS enforcement
  ```bash
  # Create 2 user accounts
  # User A creates appointment
  # Login as User B
  # Try to view User A's appointment
  # Should fail or see nothing
  ```

- [ ] **6.3** Check indexes
  ```sql
  SELECT * FROM pg_indexes
  WHERE tablename IN ('appointments', 'queue_tickets', 'notifications');
  ```
  
  **Expected:** 10+ indexes shown

- [ ] **6.4** Backup database
  ```bash
  # In Supabase Dashboard:
  # Click "Backups"
  # Enable daily backups
  # Take manual backup
  ```

---

## Phase 7: Production Deployment (Vercel)

- [ ] **7.1** Connect to Vercel
  ```bash
  npm i -g vercel
  vercel login
  ```

- [ ] **7.2** Create Vercel project
  ```bash
  vercel link
  ```

- [ ] **7.3** Add environment variables to Vercel
  - Go to https://vercel.com/dashboard
  - Select project → Settings → Environment Variables
  - Add all variables from `.env.local`
  - Mark sensitive ones as "Sensitive"

- [ ] **7.4** Preview deployment
  ```bash
  vercel deploy --prebuilt
  ```

- [ ] **7.5** Production deployment
  ```bash
  vercel deploy --prod
  ```

- [ ] **7.6** Test production build
  ```bash
  vercel env pull .env.production.local
  npm run build
  npm start
  ```

---

## Phase 8: Monitoring & Alerts

- [ ] **8.1** Setup Sentry alerts
  - Sentry Dashboard → Alerts
  - Create alert for errors
  - Set recipients

- [ ] **8.2** Setup Supabase backups
  - Supabase Dashboard → Backups
  - Enable daily backups
  - Set retention policy

- [ ] **8.3** Setup uptime monitoring
  - Use service like Uptime.com or Better Stack
  - Monitor https://yourdomain.com
  - Set alert threshold

- [ ] **8.4** Setup error budget
  - Track error rate in Sentry
  - Set SLA: <0.1% errors
  - Monitor weekly

---

## Phase 9: Security Review

- [ ] **9.1** Verify no secrets in code
  ```bash
  git log --all --full-history -- .env.local
  # Should show nothing
  ```

- [ ] **9.2** Verify RLS is enforced
  ```sql
  SELECT * FROM pg_settings WHERE name = 'role';
  # Should NOT be 'postgres' in production
  ```

- [ ] **9.3** Verify service role key is not used in client
  ```bash
  grep -r "SUPABASE_SERVICE_ROLE_KEY" src/
  # Should return nothing (only in server.ts)
  ```

- [ ] **9.4** Check for hardcoded credentials
  ```bash
  grep -r "password\|token\|secret" --include="*.ts" --include="*.tsx" src/
  # Should be empty
  ```

- [ ] **9.5** Enable HTTPS
  - Vercel auto-enables HTTPS
  - Verify certificate: https://yourdomain.com
  - Check SSL score: https://www.ssllabs.com/ssltest/

---

## Phase 10: Load Testing (Optional)

- [ ] **10.1** Prepare load test
  ```bash
  # Using k6 or Artillery
  npm install -g artillery
  ```

- [ ] **10.2** Create test script
  ```yaml
  # test-load.yml
  config:
    target: "https://yourdomain.com"
    phases:
      - duration: 60
        arrivalRate: 100
  scenarios:
    - flow:
        - get:
            url: "/"
        - post:
            url: "/api/appointments"
  ```

- [ ] **10.3** Run load test
  ```bash
  artillery run test-load.yml
  ```

- [ ] **10.4** Analyze results
  - Check response times (should be <1s)
  - Check error rate (should be <0.1%)
  - Monitor CPU/memory in Vercel

---

## Phase 11: Documentation

- [ ] **11.1** Document deployment process
  - Create DEPLOYMENT.md
  - Include rollback procedures

- [ ] **11.2** Document monitoring setup
  - Create MONITORING.md
  - Include alert procedures

- [ ] **11.3** Document incident response
  - Create INCIDENTS.md
  - Include runbooks

- [ ] **11.4** Update README
  - Add production deployment instructions
  - Add troubleshooting guide

---

## Phase 12: Go Live

- [ ] **12.1** Final verification
  - All tests pass ✅
  - All environment variables set ✅
  - RLS enabled on all tables ✅
  - Backups configured ✅
  - Monitoring active ✅

- [ ] **12.2** Notify stakeholders
  - Send deployment notice
  - Include support contact
  - Set expectations

- [ ] **12.3** Monitor first 24 hours
  - Check Sentry every hour
  - Monitor error rate
  - Check performance metrics
  - Be ready to rollback if needed

- [ ] **12.4** Post-deployment review
  - Celebrate! 🎉
  - Document lessons learned
  - Plan next iteration

---

## Troubleshooting

### Dev server won't start
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Environment variables not loading
```bash
# Verify .env.local exists
ls -la .env.local

# Check file is readable
cat .env.local | head -5

# Restart dev server
npm run dev
```

### Database connection failed
```bash
# Test Supabase connection
npx supabase projects list

# Verify anon key is correct
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Redis cache not working
```bash
# Test Redis connection
curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
  "$UPSTASH_REDIS_REST_URL/ping"
```

### Sentry not capturing errors
```bash
# Check DSN is correct
echo $SENTRY_DSN

# Force an error to test
throw new Error("Test error")
```

---

## Final Checklist

- [ ] All 12 phases completed
- [ ] All tests passing
- [ ] All monitoring active
- [ ] All documentation updated
- [ ] Team trained on deployment
- [ ] Incident response plan ready
- [ ] Ready for production! 🚀

---

**Deployment Date:** _____________________  
**Deployed By:** _____________________  
**Verified By:** _____________________  

---

**Congratulations! Your application is now production-ready.** 🎉
