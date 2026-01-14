# Sentry CompanyID Implementation Guide

This guide documents adding `companyId` to all Sentry logs in Next.js for multi-tenant monitoring.

---

## Problem

Next.js runs three separate runtimes with **isolated Sentry instances**:

- **Client Runtime** (Browser): Persistent per-user session
- **Edge Runtime** (Middleware): Per-request V8 isolates
- **Server Runtime** (API Routes): Per-request Node.js process

**Scopes do NOT propagate between runtimes.** Each requires separate configuration.

---

## Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT (Browser)                                       │
│  • Storage: Global variable (sentryContext.ts)          │
│  • Setter: SentryUserContext component                  │
│  • Hook: beforeSendLog() → getClientCompanyId()         │
│  • Result: companyId attribute on all client logs       │
└─────────────────────────────────────────────────────────┘
                          ↓
                   HTTP Request
                          ↓
┌─────────────────────────────────────────────────────────┐
│  EDGE (Middleware)                                      │
│  • Storage: Sentry isolation scope (per-request)        │
│  • Setter: middleware.ts → setTag('companyId')          │
│  • Hook: beforeSendLog() → scope.tags.companyId         │
│  • Result: companyId attribute on middleware logs       │
│  ⚠️  Scope does NOT propagate to API routes             │
└─────────────────────────────────────────────────────────┘
                          ↓
                   Request continues
                          ↓
┌─────────────────────────────────────────────────────────┐
│  SERVER (API Routes - Node.js)                          │
│  • Storage: Sentry isolation scope (per-request)        │
│  • Setter: setSentryContext() in each route handler     │
│  • Hook: beforeSendLog() → scope.tags.companyId         │
│  • Result: companyId attribute on all API logs          │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation

### 1. Client Runtime

**File:** `src/instrumentation-client.ts`

```typescript
import * as Sentry from "@sentry/nextjs";
import { getClientCompanyId } from "@/lib/sentryContext";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enableLogs: true,

  beforeSendLog: (log) => {
    // Primary: Read from global storage
    let companyId = getClientCompanyId();

    // Fallback: Read from isolation scope tags
    if (!companyId) {
      const scopeData = Sentry.getIsolationScope().getScopeData();
      companyId =
        typeof scopeData?.tags?.companyId === "string"
          ? scopeData.tags.companyId
          : null;
    }

    if (companyId) {
      log.attributes = { ...log.attributes, companyId };
    }
    return log;
  },

  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
  ],
});
```

**Global Storage:** `src/lib/sentryContext.ts`

```typescript
let currentCompanyId: string | null = null;

export function setClientCompanyId(companyId: string | null) {
  currentCompanyId = companyId;
}

export function getClientCompanyId(): string | null {
  return currentCompanyId;
}
```

**Why global variable?** `getCurrentScope()` doesn't reliably return tags within `beforeSendLog` on client-side. Global variable bridges the gap between where companyId is set (component) and where it's read (hook).

> **Validation:** Testing of `getCurrentScope()` consistently returned `undefined` in the `beforeSendLog` hook across different scenarios (immediate calls, timeouts, async functions, promise chains), while both the global variable and `getIsolationScope()` returned the correct companyId every time. Sentry docs warn about this: [_"There are no guarantees about the consistency of `getCurrentScope`"_](https://docs.sentry.io/platforms/javascript/guides/react/enriching-events/scopes/#current-scope) and recommend avoiding it. The global variable + fallback approach ensures companyId is never missing from your logs.

**Setting CompanyId:** `src/components/SentryUserContext.tsx`

```typescript
"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { setClientCompanyId } from "@/lib/sentryContext";

export function SentryUserContext({ userId, userEmail, userName, companyId }) {
  useEffect(() => {
    Sentry.setUser({ id: userId, email: userEmail, username: userName });

    // Store for beforeSendLog
    setClientCompanyId(companyId);

    // Set as tag for filtering
    Sentry.getIsolationScope().setTag("companyId", companyId);
  }, [userId, userEmail, userName, companyId]);

  return null;
}
```

---

### 2. Edge Runtime (Middleware)

**File:** `sentry.edge.config.ts`

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enableLogs: true,

  beforeSendLog: (log) => {
    const scopeData = Sentry.getIsolationScope().getScopeData();
    const companyId = scopeData?.tags?.companyId;

    if (companyId) {
      log.attributes = { ...log.attributes, companyId };
    }
    return log;
  },

  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
  ],
});
```

**Setting CompanyId:** `src/middleware.ts`

```typescript
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getCurrentUser } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const user = await getCurrentUser();

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });

    // Set companyId on isolation scope
    Sentry.getIsolationScope().setTag("companyId", user.companyId);
  }

  return NextResponse.next();
}
```

---

### 3. Server Runtime (API Routes)

**File:** `sentry.server.config.ts`

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enableLogs: true,

  beforeSendLog: (log) => {
    const scopeData = Sentry.getIsolationScope().getScopeData();
    const companyId = scopeData?.tags?.companyId;

    if (companyId) {
      log.attributes = { ...log.attributes, companyId };
    }
    return log;
  },

  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
  ],
});
```

**Helper Function:** `src/lib/sentry-helpers.ts`

```typescript
import * as Sentry from "@sentry/nextjs";
import { getCurrentUser } from "./auth";

/**
 * Sets Sentry context (user + companyId) for the current request.
 * MUST be called at the start of every API route handler.
 *
 * Middleware scope does NOT propagate to API routes - each route
 * must explicitly set context.
 */
export async function setSentryContext(): Promise<void> {
  const user = await getCurrentUser();

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });

    // Set companyId as tag (picked up by beforeSendLog)
    Sentry.getIsolationScope().setTag("companyId", user.companyId);
  }
}
```

**Usage in API Routes:** `src/app/api/*/route.ts`

```typescript
import { setSentryContext } from "@/lib/sentry-helpers";

export async function POST(request: NextRequest) {
  // CRITICAL: Call BEFORE try block
  await setSentryContext();

  try {
    // Route logic - all logs will have companyId
    console.log("Processing order");
  } catch (error) {
    // Error logs will also have companyId
    console.error("Error:", error);
  }
}
```

---

## Critical: Scope Isolation

### Why `getIsolationScope()`?

Sentry provides three scope levels:

```typescript
// Global Scope - Entire application (NEVER use for user data)
Sentry.getGlobalScope().setTag("key", "value");

// Isolation Scope - Per-request/session (USE THIS)
Sentry.getIsolationScope().setTag("key", "value");

// Current Scope - Per-operation/transaction
Sentry.getCurrentScope().setTag("key", "value");
```

**Server-side:** Next.js handles concurrent requests in the same Node.js process. Using global scope causes data leaks between users:

```typescript
// ❌ Data leak between concurrent users
Sentry.getGlobalScope().setTag("companyId", user.companyId);

// Request 1: Alice (company-A) → sets tag
// Request 2: Bob (company-B) → overwrites tag
// Result: Alice's logs show company-B! 🚨

// ✅ CORRECT - Per-request isolation
Sentry.getIsolationScope().setTag("companyId", user.companyId);
// Isolated via async local storage - no data leaks
```

**Client-side:** Isolation scope persists across page navigations for single-user session.

---

## Common Mistakes

### ❌ Wrong: Context Inside Try Block

```typescript
export async function POST(request: NextRequest) {
  try {
    await setSentryContext(); // ← WRONG
    // logic
  } catch (error) {
    console.error("Error:", error); // ← No companyId!
  }
}
```

### ✅ Correct: Context Before Try Block

```typescript
export async function POST(request: NextRequest) {
  await setSentryContext(); // ← CORRECT

  try {
    // logic
  } catch (error) {
    console.error("Error:", error); // ← Has companyId ✅
  }
}
```

### ❌ Wrong: Using `setAttributes()`

```typescript
// beforeSendLog reads from tags, not attributes
Sentry.getIsolationScope().setAttributes({ companyId: user.companyId });
```

### ✅ Correct: Using `setTag()`

```typescript
Sentry.getIsolationScope().setTag("companyId", user.companyId);
```

### ❌ Wrong: Using Global Scope

```typescript
// Can cause data leaks between concurrent requests
Sentry.getGlobalScope().setTag("companyId", user.companyId);
```

### ✅ Correct: Using Isolation Scope

```typescript
// Per-request isolation, no data leaks
Sentry.getIsolationScope().setTag("companyId", user.companyId);
```

---

## Verification

### Sentry Query

Filter logs by company:

```
companyId:company-abc-123
```

### Expected Log Structure

```json
{
  "message": "Order created successfully",
  "companyId": "company-abc-123",
  "user": {
    "id": "user-2",
    "email": "bob@company.com"
  }
}
```

### Logs Without CompanyId (Expected)

- Build/compilation logs
- System startup logs
- Unauthenticated requests

---

## Key Takeaways

1. **Three isolated runtimes** require three separate implementations
2. **Middleware scope does NOT propagate** to API routes
3. **Use `getIsolationScope()`** for per-request isolation (prevents data leaks)
4. **Set context before try blocks** to ensure error logs have companyId
5. **Client needs global variable** because scope tags aren't reliable in beforeSendLog
6. **Use `setTag()` not `setAttributes()`** - beforeSendLog reads from tags

---

## Updated Approach: NextAuth + setAttribute (SDK v10.32.0+)

**Improvement:** No database calls in middleware, simpler code with `setAttribute()` API.

### Authentication with NextAuth

Store `companyId` in JWT token (no DB calls needed):

**File:** `src/lib/auth-config.ts`
```typescript
export const authOptions: NextAuthOptions = {
  providers: [CredentialsProvider({ /* ... */ })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.companyId = user.companyId
      return token
    },
    async session({ session, token }) {
      session.user.companyId = token.companyId
      return session
    },
  },
  session: { strategy: "jwt" },
}
```

### Middleware (No DB Call)

**File:** `src/middleware.ts`
```typescript
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request }) // Reads JWT, no DB

  if (token) {
    Sentry.setUser({ id: token.sub, email: token.email, username: token.name })
    Sentry.getIsolationScope().setAttribute('companyId', token.companyId)
  }

  return NextResponse.next()
}
```

### API Routes (No DB Call)

`getCurrentUser()` now uses `getServerSession()` which reads JWT:

```typescript
export async function getCurrentUser() {
  const session = await getServerSession(authOptions) // Reads JWT, no DB
  if (!session?.user) return null
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    companyId: session.user.companyId,
  }
}
```

### Client

```typescript
// SentryUserContext.tsx
Sentry.getIsolationScope().setAttribute('companyId', companyId)
```

### Key Changes

- **NextAuth JWT**: `companyId` stored in token (no DB lookups)
- **`setAttribute()`**: SDK v10.32.0+ automatically applies to logs (no `beforeSendLog` hooks)
- **Middleware**: Uses `getToken()` instead of database calls
- **Simpler**: ~90% less code, same isolation guarantees

**Environment:**
```bash
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3001
```
