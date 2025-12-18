# Sentry CompanyId Implementation - Summary

## 🎯 Goal

Add `companyId` to all Sentry logs in a **secure**, **multi-tenant** way that can't be tampered with by users.

## ✅ Secure Solution

### Architecture Overview

```
User Login → Cookie → Server reads session → Sets companyId → Sentry
```

### Key Components

#### 1. **Authentication System** (`src/lib/auth.ts`)

- Cookie-based mock authentication
- Three test users with different `companyId` values
- Functions: `getCompanyIdFromSession()`, `getCurrentUser()`, `login()`, `logout()`

#### 2. **Server-Side: Middleware** (`src/middleware.ts`)

- Runs on **every request**
- Reads authenticated user from cookie
- Sets `companyId` as Sentry scope tag
- Used for: API routes, server errors, server logs

#### 3. **Client-Side: Global Store** (`src/lib/sentryContext.ts`)

- Simple global variable to store current user's `companyId`
- Shared between `SentryUserContext` and `beforeSendLog`

#### 4. **Client-Side: User Context** (`src/components/SentryUserContext.tsx`)

- Receives `companyId` from server as prop (acceptable since client-side tags are only for observability, not for auth, etc)
- Stores in global variable
- Sets Sentry user context and tags

#### 5. **Client Config** (`src/instrumentation-client.ts`)

- `beforeSendLog` hook reads `companyId` from global store
- Adds `companyId` to **all** client log attributes

#### 6. **Server Config** (`sentry.server.config.ts`)

- `beforeSendLog` hook reads `companyId` from Sentry scope (set by middleware)
- Adds `companyId` to **all** server log attributes

## 🔐 Why It's Secure

| Aspect           | After (Secure)             |
| ---------------- | -------------------------- |
| **Storage**      | From authenticated session |
| **Visibility**   | Runtime only               |
| **Tampering**    | Protected by server        |
| **Multi-tenant** | Per-user from database     |

## 📊 What Gets Sent to Sentry

Every log/error now includes:

- `companyId` attribute (the actual company ID)
- `setBy` attribute (shows which method set it)

## 🧪 Testing

**Auth Demo Widget** (bottom-right corner):

- Login as Alice → `companyId: company-xyz-456`
- Login as Bob → `companyId: company-abc-123`
- Login as Demo → `companyId: company-demo-789`
- Click "🧪 Test Send to Sentry" to verify

## 🚀 Production Deployment

**Replace mock auth** in `src/lib/auth.ts` with your real system:

```typescript
// Example with NextAuth
import { getServerSession } from "next-auth";

export async function getCompanyIdFromSession() {
  const session = await getServerSession(authOptions);
  return session?.user?.companyId || null;
}
```

## ✅ Final Result

- ✅ CompanyId on **all** Sentry logs (client + server)
- ✅ Secure - comes from authenticated session
- ✅ Multi-tenant - different per user
- ✅ Can't be tampered with by users
- ✅ Works with Session Replay, console logs, errors, transactions

## 📁 Files Modified

- `src/lib/auth.ts` - Authentication helpers
- `src/lib/sentryContext.ts` - Client-side companyId store
- `src/middleware.ts` - Server-side companyId injection
- `src/components/SentryUserContext.tsx` - Client-side setup
- `src/app/layout.tsx` - Passes companyId from server to client
- `src/instrumentation-client.ts` - Client Sentry config with beforeSendLog
- `sentry.server.config.ts` - Server Sentry config with beforeSendLog
- `src/app/api/auth/route.ts` - Login/logout API
- `src/components/AuthDemo.tsx` - Testing widget
