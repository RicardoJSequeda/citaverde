# Dev Server Issues & Fixes

## Issue: Dev Server Crash with `.next/routes-manifest.json` Error

### Error Message
```
⨯ [Error: ENOENT: no such file or directory, open '/root/app/code/.next/routes-manifest.json']
```

### Root Cause
After making significant changes to the codebase (adding new files, dependencies, etc.), Next.js's build cache becomes invalid. The `.next` folder needs to be rebuilt.

### Solution

#### Step 1: Clean the Build Cache
```bash
# Remove Next.js build folder
rm -rf .next

# Clear npm cache
npm cache clean --force
```

#### Step 2: Reinstall Dependencies
```bash
# Remove node_modules
rm -rf node_modules

# Remove lock files
rm package-lock.json pnpm-lock.yaml yarn.lock 2>/dev/null || true

# Reinstall with your package manager
npm install
# or
pnpm install
# or
yarn install
```

#### Step 3: Restart Dev Server
```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

### Expected Output
```
▲ Next.js 15.5.4
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in 5.2s
```

---

## Step-by-Step Recovery

### For npm Users
```bash
# 1. Stop the dev server (Ctrl+C)

# 2. Clean everything
rm -rf .next node_modules package-lock.json

# 3. Reinstall
npm install

# 4. Run build to verify
npm run build

# 5. Start dev server
npm run dev
```

### For pnpm Users
```bash
# 1. Stop the dev server (Ctrl+C)

# 2. Clean everything
rm -rf .next node_modules pnpm-lock.yaml

# 3. Reinstall
pnpm install

# 4. Run build to verify
pnpm build

# 5. Start dev server
pnpm dev
```

### For Yarn Users
```bash
# 1. Stop the dev server (Ctrl+C)

# 2. Clean everything
rm -rf .next node_modules yarn.lock

# 3. Reinstall
yarn install

# 4. Run build to verify
yarn build

# 5. Start dev server
yarn dev
```

---

## Verify Installation

After reinstalling, verify everything is correct:

```bash
# Check Node version (should be 18+)
node --version

# Check npm version
npm --version

# Check dependencies installed
npm ls @upstash/redis @upstash/qstash opossum uuid

# Expected output:
# citaverde@0.1.0
# ├── @upstash/qstash@2.4.0
# ├── @upstash/redis@1.34.0
# ├── opossum@8.1.0
# └── uuid@9.0.1
```

---

## Common Issues During Recovery

### Issue: `npm install` Takes Forever

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Try with specific registry
npm install --registry https://registry.npmjs.org/

# Or use yarn if faster
yarn install
```

### Issue: EACCES Permission Denied

**Solution:**
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm

# Or use nvm to manage Node
curl https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm use 18
npm install
```

### Issue: Disk Space Error

**Solution:**
```bash
# Check disk space
df -h

# Clean up npm cache
npm cache clean --force

# Remove old build artifacts
rm -rf .next dist build
```

### Issue: Port 3000 Already in Use

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

---

## If Problems Persist

### Complete Nuclear Option
```bash
# 1. Remove everything
rm -rf node_modules .next .npm .pnpm-store dist build

# 2. Remove lock files
rm package-lock.json pnpm-lock.yaml yarn.lock 2>/dev/null || true

# 3. Clear all caches
npm cache clean --force
pnpm store prune 2>/dev/null || true

# 4. Fresh install
npm install

# 5. Verify package.json
cat package.json | grep -A 5 '"dependencies"'

# 6. Test build
npm run build

# 7. Start fresh
npm run dev
```

### Check for File Issues
```bash
# Verify new files exist
ls -la lib/security/rate-limiting.ts
ls -la lib/security/idempotency.ts
ls -la lib/resilience/circuit-breaker.ts
ls -la lib/cache/cache-strategy.ts
ls -la lib/workers/notification-queue.ts
ls -la app/api/notifications/process/route.ts

# Verify syntax of key files
npx tsc --noEmit lib/security/rate-limiting.ts
```

---

## Environment Variables Check

After dev server starts, verify environment variables are loaded:

```bash
# In browser console or server logs
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
console.log(process.env.UPSTASH_REDIS_REST_URL)
console.log(process.env.QSTASH_TOKEN)
console.log(process.env.SENTRY_DSN)

# Should show actual values, not "undefined"
```

If values are undefined:
```bash
# 1. Verify .env.local exists
ls -la .env.local

# 2. Verify variables are in .env.local
cat .env.local | head -5

# 3. Restart dev server (critical!)
npm run dev
```

---

## TypeScript Compilation Check

If TypeScript errors appear:

```bash
# Run type checking
npx tsc --noEmit

# If errors, show them
npx tsc --noEmit 2>&1 | head -20
```

Common TypeScript fixes:
```typescript
// Add missing imports
import { Redis } from "@upstash/redis"
import CircuitBreaker from "opossum"
import { v4 as uuid } from "uuid"

// Ensure proper typing
const redis: Redis = new Redis(...)
const breaker: CircuitBreaker = new CircuitBreaker(...)
```

---

## Next.js Cache Issues

If you see build errors related to cache:

```bash
# Clear Next.js internal cache
rm -rf .next/cache

# Rebuild without cache
npm run build -- --no-cache

# Or run with experimental flag
NEXT_SKIP_ENV_VALIDATION=1 npm run dev
```

---

## Production Build Test

Before deploying, always test production build:

```bash
# 1. Build
npm run build

# Expected output:
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
# ✓ Creating optimized production build

# 2. Test build locally
npm start

# 3. Open http://localhost:3000
# Should work exactly like dev server
```

---

## Deployment Pipeline Check

```bash
# 1. Install dependencies
npm install

# 2. Build
npm run build

# 3. Test
npm test  # if available

# 4. Lint (if linter is configured)
npm run lint

# 5. Deploy
vercel deploy --prod
```

---

## Still Having Issues?

### Get Help
1. Check logs: `npm run dev 2>&1 | tee build.log`
2. Check error file: `cat build.log | head -50`
3. Search error message in Next.js docs
4. Check GitHub issues for similar problems

### Try This Command
```bash
# Complete clean and rebuild
npm ci && npm run build && npm run dev
```

### Contact Support
If stuck, provide:
```bash
# 1. Node version
node --version

# 2. npm version
npm --version

# 3. Full error log
npm run dev 2>&1

# 4. package.json dependencies
cat package.json | grep -A 30 '"dependencies"'

# 5. File list
ls -la lib/security/ lib/resilience/ lib/cache/ lib/workers/ app/api/notifications/
```

---

## Success Indicators

✅ Dev server starts without errors  
✅ No "ENOENT" or "ENODEV" errors  
✅ Next.js banner shows with URL  
✅ Environment variables load correctly  
✅ Pages load at http://localhost:3000  
✅ No TypeScript errors  
✅ Hot reload works (change file, auto-refresh)  

---

**Once dev server is running, move on to SETUP_CHECKLIST.md** ✅
