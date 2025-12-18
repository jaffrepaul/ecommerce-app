# Secure CompanyId Flow with Sentry

## 🎯 Overview

**SECURE** implementation using Sentry's per-request scope isolation - `setTag()` + `beforeSendLog()` approach.

### Security Features:

- ✅ **Server**: Uses Sentry's AsyncLocalStorage for per-request isolation (no global variables)
- ✅ **Client**: Uses Sentry's client scope (safe in browser - each user has own session)
- ✅ **API Routes**: Each route sets companyId (Next.js requirement)
- ✅ **No Data Leakage**: CompanyId never leaks between users

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
│ 3. STORE IN GLOBAL                                          │
└─────────────────────────────────────────────────────────────┘
          │                                   │
          ▼                                   ▼
    setCompanyId(                       Pass as prop to:
      'company-xyz-456')                <SentryUserContext
          │                               companyId="..." />
          │                                   │
          │                                   ▼
          │                       ┌──────────────────────────┐
          │                       │ src/components/          │
          │                       │ SentryUserContext.tsx    │
          │                       └──────────────────────────┘
          │                                   │
          │                                   ▼
          │                           setCompanyId(
          │                             'company-xyz-456')
          │                                   │
          └───────────────┬───────────────────┘
                          │
                          ▼
           ┌──────────────────────────────────┐
           │  src/lib/sentryContext.ts        │
           │                                  │
           │  GLOBAL VARIABLE:                │
           │  currentCompanyId =              │
           │  'company-xyz-456'               │
           └──────────────────────────────────┘
                          │
                          │ Used by:
          ┌───────────────┴────────────────┐
          │                                │
          ▼                                ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. LOG CREATED (console.log or error)                      │
└─────────────────────────────────────────────────────────────┘
          │                                │
    SERVER LOG                       CLIENT LOG
          │                                │
          ▼                                ▼
┌───────────────────────┐      ┌─────────────────────────────┐
│ sentry.server.config  │      │ instrumentation-client.ts   │
└───────────────────────┘      └─────────────────────────────┘
          │                                │
          ▼                                ▼
    beforeSendLog() {              beforeSendLog() {
          │                                │
          ▼                                ▼
    companyId =                    companyId =
    getCompanyId()                 getCompanyId()
          │                                │
          ▼                                ▼
    log.attributes.companyId       log.attributes.companyId
    = 'company-xyz-456'            = 'company-xyz-456'
          │                                │
    }                              }
          │                                │
          └────────────┬───────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. SENT TO SENTRY WITH COMPANYID                           │
└─────────────────────────────────────────────────────────────┘

    Sentry Dashboard shows:
    ├─ User: { id, email, username }
    └─ Log Attributes: { companyId: 'company-xyz-456' }
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
    ├─ Runs on EVERY request
    ├─ getCurrentUser()
    ├─ Sentry.setUser() → User context
    └─ Sentry.setTag('companyId', user.companyId)
       ↳ SECURE: Per-request scope (AsyncLocalStorage)

    src/app/api/*/route.ts (API Route Handlers)
    ├─ Each route has its own execution context
    ├─ getCurrentUser() → Get user from session
    ├─ Sentry.setUser() → User context
    └─ Sentry.setTag('companyId', user.companyId)
       ↳ REQUIRED: API routes don't inherit middleware scope
       ↳ SECURE: Each request isolated via AsyncLocalStorage

    sentry.server.config.ts
    ├─ Sentry.init()
    └─ beforeSendLog() {
         companyId = getCurrentScope().getScopeData().tags?.companyId
         log.attributes.companyId = companyId
      }

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
    └─ Sentry.setTag('companyId', companyId)
       ↳ SECURE: Client-side scope (browser session)

    src/instrumentation-client.ts
    ├─ Sentry.init()
    └─ beforeSendLog() {
         companyId = getCurrentScope().getScopeData().tags?.companyId
         log.attributes.companyId = companyId
      }
```

---

## 🔑 Key Points

| What                     | Where                                  | How                                       |
| ------------------------ | -------------------------------------- | ----------------------------------------- |
| **Get CompanyId**        | `src/lib/auth.ts`                      | Reads cookie → looks up user              |
| **Set on Server**        | `src/middleware.ts`                    | `Sentry.setTag('companyId', ...)`         |
| **Set in API Routes**    | `src/app/api/*/route.ts`               | `Sentry.setTag('companyId', ...)`         |
| **Set on Client**        | `src/components/SentryUserContext.tsx` | `Sentry.setTag('companyId', ...)`         |
| **Add to Logs (Server)** | `sentry.server.config.ts`              | `beforeSendLog` reads from scope tags     |
| **Add to Logs (Client)** | `src/instrumentation-client.ts`        | `beforeSendLog` reads from scope tags     |
| **Security**             | Sentry SDK                             | AsyncLocalStorage (server) + Client scope |

---

## 💡 The Magic

**TWO parts make it work:**

```typescript
// Part 1: Set in Sentry scope (middleware/API routes/client)
Sentry.setTag("companyId", user.companyId);

// Part 2: Read in beforeSendLog (both client & server)
const companyId = Sentry.getCurrentScope().getScopeData().tags?.companyId;
log.attributes.companyId = companyId;
```

**Why this is SECURE:**

- ✅ **Server**: Sentry uses Node.js AsyncLocalStorage → Each request isolated
- ✅ **Client**: Each browser session has own scope → No cross-user leakage
- ✅ **No Global Variables**: No shared state that could leak between requests

---

## ✅ What This Achieves

- ✅ CompanyId on **all logs** (client + server)
- ✅ **SECURE**: Per-request isolation (server) and per-session (client)
- ✅ **No Data Leakage**: User A's companyId never appears in User B's logs
- ✅ Simple `setTag()` + `beforeSendLog()` pattern
- ✅ Works with Next.js App Router architecture
- ✅ Uses Sentry's built-in AsyncLocalStorage for request isolation

---

## 🔒 Security Deep Dive

### Why This Implementation is Secure

#### Server-Side (Node.js/Edge)

```typescript
// In middleware or API routes:
Sentry.setTag("companyId", user.companyId);
```

**How Sentry Keeps Requests Isolated:**

- Sentry SDK uses Node.js `AsyncLocalStorage` API
- Each HTTP request gets its own isolated scope
- Tags set in Request A are **not visible** to Request B
- No shared global state

**Example:**

```typescript
// Request 1 (User Alice)
Sentry.setTag("companyId", "acme-corp"); // Isolated to this request

// Request 2 (User Bob) - runs concurrently
Sentry.setTag("companyId", "evil-corp"); // Isolated to this request

// Request 1's log
// companyId = 'acme-corp' ✅ Correct!

// Request 2's log
// companyId = 'evil-corp' ✅ Correct!
```

#### Client-Side (Browser)

```typescript
// In SentryUserContext:
Sentry.setTag("companyId", companyId);
```

**How Client Scope Works:**

- Each browser tab/window has its own JavaScript context
- One user cannot access another user's browser session
- Safe to store in client-side Sentry scope

#### Why API Routes Need CompanyId Set

**Next.js Architecture Limitation:**

```typescript
// ❌ This doesn't work:
// middleware.ts
Sentry.setTag("companyId", user.companyId);

// api/orders/route.ts
// companyId is NOT available here!
```

**Why?**

- Middleware and API routes run in **separate execution contexts**
- Each gets its own AsyncLocalStorage scope
- Solution: Set `companyId` in **each** API route
