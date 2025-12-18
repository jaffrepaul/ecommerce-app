# Simplified CompanyId Flow with Sentry Scope Attributes

## 🎯 Overview

Using Sentry SDK 10.32.0+ **scope attributes** feature - companyId is automatically added to all logs, spans, and errors!

**Key Innovation:** `setAttributes()` eliminates the need for:

- ❌ Global store workarounds
- ❌ `beforeSendLog` hooks
- ❌ Manual attribute injection
- ✅ Attributes are automatically applied by Sentry!

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER LOGS IN                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
         User clicks "Login as Alice"
                            │
                            ▼
         POST /api/auth → login(userId)
                            │
                            ▼
         Sets cookie: userId=user-1
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. REQUEST / PAGE LOAD                                      │
└─────────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
    SERVER SIDE                         CLIENT SIDE
          │                                   │
          ▼                                   ▼
┌───────────────────────┐         ┌────────────────────────────┐
│  src/middleware.ts    │         │  src/app/layout.tsx        │
│  (Edge Middleware)    │         │  (Server Component)        │
└───────────────────────┘         └────────────────────────────┘
          │                                   │
          ▼                                   ▼
    getCurrentUser()                    getCurrentUser()
          │                                   │
          ▼                                   ▼
    Cookie → MOCK_USERS                 Cookie → MOCK_USERS
          │                                   │
          ▼                                   ▼
    user.companyId                      user.companyId
    = 'company-xyz-456'                 = 'company-xyz-456'
          │                                   │
          ▼                                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SET SCOPE ATTRIBUTES (NEW!)                              │
└─────────────────────────────────────────────────────────────┘
          │                                   │
          ▼                                   ▼
    Sentry.getCurrentScope()           Pass as prop to:
      .setAttributes({                 <SentryUserContext
        companyId: '...'                 companyId="..." />
      })                                      │
          │                                   ▼
          │                       ┌──────────────────────────┐
          │                       │ src/components/          │
          │                       │ SentryUserContext.tsx    │
          │                       └──────────────────────────┘
          │                                   │
          │                                   ▼
          │                       Sentry.getCurrentScope()
          │                         .setAttributes({
          │                           companyId: '...'
          │                         })
          │                                   │
          └───────────────┬───────────────────┘
                          │
                          ▼
           ┌──────────────────────────────────┐
           │  SENTRY SCOPE ATTRIBUTES         │
           │  (Managed by SDK)                │
           │                                  │
           │  attributes: {                   │
           │    companyId: 'company-xyz-456'  │
           │  }                               │
           └──────────────────────────────────┘
                          │
                          │ Automatically applied to:
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
       LOGS           SPANS           ERRORS
          │               │                │
          └───────────────┴────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SENT TO SENTRY WITH COMPANYID (AUTOMATIC!)              │
└─────────────────────────────────────────────────────────────┘

    Sentry Dashboard shows:
    ├─ User: { id, email, username }
    └─ Attributes: { companyId: 'company-xyz-456' }
       ├─ On all logs
       ├─ On all spans
       └─ On all errors
```

---

## 🗂️ File Responsibilities

```
┌────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION                             │
└────────────────────────────────────────────────────────────────┘

    src/lib/auth.ts
    ├─ getCurrentUser() → Gets user from cookie
    ├─ MOCK_USERS → Database simulation
    └─ Returns: { id, email, name, companyId }

┌────────────────────────────────────────────────────────────────┐
│                     SERVER PATH                                │
└────────────────────────────────────────────────────────────────┘

    src/middleware.ts
    ├─ Runs on EVERY request (before route handlers)
    ├─ getCurrentUser()
    ├─ Sentry.setUser() → User context
    └─ Sentry.getIsolationScope().setAttributes({ companyId })
       ↳ Sets request-level attributes for middleware scope

    src/app/api/*/route.ts (API Route Handlers)
    ├─ Each route has its own execution context
    ├─ getCurrentUser() → Get user from session
    ├─ Sentry.setUser() → User context
    └─ Sentry.getIsolationScope().setAttributes({ companyId })
       ↳ Automatically added to all logs/spans/errors in this route!
       ↳ Required because API routes don't inherit middleware scope

    sentry.server.config.ts
    ├─ Sentry.init()
    ├─ enableLogs: true (production only)
    └─ consoleLoggingIntegration()
       ↳ No beforeSendLog needed - attributes are automatic!

┌────────────────────────────────────────────────────────────────┐
│                     CLIENT PATH                                │
└────────────────────────────────────────────────────────────────┘

    src/app/layout.tsx
    ├─ Server component
    ├─ getCurrentUser()
    └─ Passes companyId to <SentryUserContext />

    src/components/SentryUserContext.tsx
    ├─ Receives companyId as prop
    ├─ Sentry.setUser() → User context
    └─ Sentry.getIsolationScope().setAttributes({ companyId })
       ↳ Sets session-level attributes
       ↳ Automatically added to all client-side logs/spans/errors!

    src/instrumentation-client.ts
    ├─ Sentry.init()
    ├─ enableLogs: true (production only)
    └─ consoleLoggingIntegration()
       ↳ No beforeSendLog needed - attributes are automatic!
```

---

## 🔑 Key Points

| What              | Where                                  | How                                   |
| ----------------- | -------------------------------------- | ------------------------------------- |
| **Get CompanyId** | `src/lib/auth.ts`                      | Reads cookie → looks up user          |
| **Set on Server** | `src/middleware.ts`                    | `getIsolationScope().setAttributes()` |
| **Set on Client** | `src/components/SentryUserContext.tsx` | `getIsolationScope().setAttributes()` |
| **Add to Logs**   | Automatic! ✨                          | Sentry SDK handles it (v10.32.0+)     |
| **Add to Spans**  | Automatic! ✨                          | Sentry SDK handles it                 |
| **Add to Errors** | Automatic! ✨                          | Sentry SDK handles it                 |

---

## 💡 The Magic

**ONE LINE does all the work:**

```typescript
// In middleware (server) or SentryUserContext (client):
// Using Isolation Scope for request-level (server) / session-level (client) attributes
Sentry.getIsolationScope().setAttributes({
  companyId: user.companyId,
});
```

That's it! Sentry automatically adds these attributes to:

- ✅ All console logs
- ✅ All performance spans
- ✅ All errors and exceptions
- ✅ All breadcrumbs

No hooks needed. No manual injection. Just works!

---

## ⚠️ Important: Next.js Scope Isolation

**Key Discovery:** In Next.js App Router, middleware and API route handlers run in **separate execution contexts** with their own Sentry scopes. This means:

❌ **Won't work:**

```typescript
// Setting in middleware only
export async function middleware(request) {
  Sentry.getIsolationScope().setAttributes({ companyId: "..." });
  // API routes won't see this!
}
```

✅ **Will work:**

```typescript
// Set in BOTH middleware AND each API route
export async function middleware(request) {
  const user = await getCurrentUser();
  Sentry.getIsolationScope().setAttributes({ companyId: user.companyId });
}

// In each API route:
export async function POST(request) {
  const user = await getCurrentUser();
  Sentry.getIsolationScope().setAttributes({ companyId: user.companyId });
  // Now all logs/errors in this route will have companyId!
}
```

This is a **Next.js architectural limitation**, not a Sentry SDK issue. Each route handler gets its own scope for request isolation and security.

---

## 🆕 What Changed in SDK 10.32.0

### Before (Old Approach)

**Problem:** Had to use workarounds:

```typescript
// Server: Use tags as intermediary
Sentry.setTag("companyId", user.companyId);

// Then read in beforeSendLog
beforeSendLog: (log) => {
  const companyId = getCurrentScope().getScopeData().tags?.companyId;
  log.attributes.companyId = companyId;
  return log;
};

// Client: Use global variable
let globalCompanyId = null;
setCompanyId(user.companyId); // Store globally

beforeSendLog: (log) => {
  log.attributes.companyId = getCompanyId(); // Read from global
  return log;
};
```

### After (New Approach - SDK 10.32.0+)

**Solution:** Direct scope attributes with proper scope hierarchy!

```typescript
// Both server and client - same simple API:
// Use Isolation Scope for request/session-level attributes
Sentry.getIsolationScope().setAttributes({
  companyId: user.companyId,
});

// Automatically applied to ALL logs, spans, and errors!
// No beforeSendLog hook needed!
// No global variables needed!
```

**Key Benefits:**

- ✨ Logs captured via `console.log()` automatically include `companyId`
- ✨ Works with `consoleLoggingIntegration()` out of the box
- ✨ Proper scope isolation for request/session-level attributes
- ✨ No manual log transformation hooks required

---

## ✅ What This Achieves

- ✅ CompanyId on **all logs** (client + server)
- ✅ CompanyId on **all spans** (performance traces)
- ✅ CompanyId on **all errors** (exceptions)
- ✅ Secure (from authenticated session)
- ✅ Simple (one API call)
- ✅ Consistent (same pattern both sides)
- ✅ **50% less code** (no hooks, no global store)
- ✅ **Official SDK feature** (not a workaround)

---

## 🔐 Security: Per-Request Isolation

### Server (Edge/Node)

- ✅ Each request gets its own scope (async local storage)
- ⚠️ **Important:** Middleware and API routes run in separate execution contexts
- ✅ Need to set attributes in **both** middleware and API route handlers
- ✅ No risk of leaking companyId between users
- ✅ Safe for multi-tenant applications

**Why set attributes in API routes?**

In Next.js, middleware runs first but API route handlers have their own scope. Attributes set in middleware don't automatically carry over to API routes. Solution: Set scope attributes at the beginning of any API route that generates logs/errors:

```typescript
// In src/app/api/orders/route.ts
export async function POST(request: NextRequest) {
  // Get authenticated user and set scope attributes
  const authenticatedUser = await getCurrentUser();
  if (authenticatedUser) {
    Sentry.setUser({
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      username: authenticatedUser.name,
    });

    // This ensures all logs/errors in this route have companyId
    // Using Isolation Scope for request-level attributes
    Sentry.getIsolationScope().setAttributes({
      companyId: authenticatedUser.companyId,
    });
  }

  // ... rest of route handler
}
```

### Client (Browser)

- ✅ Single global scope per user session
- ✅ Attributes persist across page navigations
- ✅ Updated when user context changes
- ✅ Perfect for user-specific context

---

## 📚 Additional Notes

### Supported Attribute Types

Currently supports: `string`, `number`, `boolean`

```typescript
Sentry.getCurrentScope().setAttributes({
  companyId: "company-123", // string ✅
  userId: 456, // number ✅
  isPremium: true, // boolean ✅
  // tags: ['tag1'],                // array ❌ (not yet)
  // meta: { key: 'val' }           // object ❌ (not yet)
});
```

### Multiple Attributes

You can set multiple attributes at once:

```typescript
Sentry.getIsolationScope().setAttributes({
  companyId: user.companyId,
  tier: user.tier,
  region: user.region,
});
```

### Scope Hierarchy (Sentry 10.32.0+)

Attributes can be set at different scope levels and automatically propagate to **all logs, spans, and errors**:

```typescript
// 1. Global scope - applies to everything (app-wide)
Sentry.getGlobalScope().setAttributes({
  environment: "production",
  region: "us-east-1",
});

// 2. Isolation scope - request-level (server) or session-level (client)
//    ✅ Use this for companyId, tenantId, etc.
Sentry.getIsolationScope().setAttributes({
  companyId: "acme-corp",
});

// 3. Current scope - most specific (transaction/operation-level)
//    Use this for operation-specific attributes
Sentry.getCurrentScope().setAttributes({
  operation: "checkout",
  step: "payment_processing",
});
```

**Why use `getIsolationScope()` for `companyId`?**

- **Server**: Scoped to the entire request lifecycle
- **Client**: Scoped to the entire user session
- Automatically inherited by all operations within that request/session
- Automatically added to console logs via `consoleLoggingIntegration()` (v10.32.0+)

---

## 🚀 Upgrade Path

1. **Update package.json:**

   ```json
   "@sentry/nextjs": "^10.32.0"
   ```

2. **Install:**

   ```bash
   npm install
   ```

3. **Migrate:**
   - Replace `setTag()` → `setAttributes()`
   - Remove `beforeSendLog` hooks
   - Delete global store files

That's it! 🎉
