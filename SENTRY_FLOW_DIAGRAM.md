# Sentry CompanyId Flow Diagram

## 🔒 Current Architecture: Secure Scope-Based Implementation

**Key Change:** Now uses Sentry's native scope mechanism instead of custom global stores.

## Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER AUTHENTICATION                              │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ User clicks login button
                                   ▼
                   ┌───────────────────────────────┐
                   │  src/components/AuthDemo.tsx  │
                   │  (Client Component)           │
                   │  • Login buttons              │
                   │  • Test Sentry button         │
                   └───────────────────────────────┘
                                   │
                                   │ POST /api/auth
                                   ▼
                   ┌───────────────────────────────┐
                   │  src/app/api/auth/route.ts    │
                   │  (API Route)                  │
                   │  • Handles login/logout       │
                   └───────────────────────────────┘
                                   │
                                   │ Calls login(userId)
                                   ▼
                   ┌───────────────────────────────┐
                   │  src/lib/auth.ts              │
                   │  • login() - sets cookie      │
                   │  • MOCK_USERS database        │
                   │  • getCurrentUser()           │
                   └───────────────────────────────┘
                                   │
                                   │ Cookie: userId=user-1
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       PAGE REQUEST (SSR)                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
       ┌─────────────────────────────────────────────────┐
       │         src/app/layout.tsx                      │
       │         (Server Component)                      │
       │         • await getCurrentUser()                │
       │         • Reads user from authenticated session │
       │         • Returns null if not authenticated     │
       └─────────────────────────────────────────────────┘
                       │                       │
                       │                       │ Pass user as prop
           (Server)    │                       │    (Client)
                       │                       │
                       ▼                       ▼
       ┌───────────────────────────┐   ┌────────────────────────────────┐
       │  src/middleware.ts        │   │  src/components/               │
       │  (Edge Middleware)        │   │  SentryUserContext.tsx         │
       │  • Runs on every request  │   │  (Client Component)            │
       │  • getCurrentUser()       │   │  • Receives user props         │
       │  • Sentry.setUser()       │   │  • Sentry.setUser()            │
       │  • Sentry.setTag(         │   │  • Sentry.setTag(              │
       │      'companyId', ...)    │   │      'companyId', ...)         │
       │  ✅ Scope per-request     │   │  ✅ Scope per-browser-session  │
       └───────────────────────────┘   └────────────────────────────────┘
                       │                       │
                       │                       │
                       ▼                       ▼
       ┌───────────────────────────┐   ┌────────────────────────────────┐
       │  API Routes (if needed)   │   │  Sentry Client Scope           │
       │  • getCurrentUser()       │   │  • Tags stored in scope        │
       │  • Sentry.setUser()       │   │  • Accessible to beforeSendLog │
       │  • Sentry.setTag(         │   │  • Per-user session            │
       │      'companyId', ...)    │   └────────────────────────────────┘
       │  ✅ Required: API routes  │               │
       │     don't inherit         │               │
       │     middleware scope      │               ▼
       └───────────────────────────┘
                       │
                       ▼
       ┌───────────────────────────┐
       │  Sentry Server Scope      │
       │  • Tags stored in scope   │
       │  • AsyncLocalStorage      │
       │  • Per-request isolation  │
       └───────────────────────────┘
                       │
                       ▼

┌───────────────────────────┐       ┌────────────────────────────────┐
│  SERVER-SIDE LOGGING      │       │  CLIENT-SIDE LOGGING           │
└───────────────────────────┘       └────────────────────────────────┘
           │                                   │
           ▼                                   ▼
┌───────────────────────────┐       ┌────────────────────────────────┐
│  sentry.server.config.ts  │       │  src/instrumentation-client.ts │
│  • Sentry.init()          │       │  • Sentry.init()               │
│  • enableLogs: true       │       │  • enableLogs: true            │
│  • beforeSendLog hook     │       │  • beforeSendLog hook          │
│    - getCurrentScope()    │       │    - getCurrentScope()         │
│    - reads companyId      │       │    - reads companyId           │
│      from scope tags      │       │      from scope tags           │
│    - adds to log.attributes│      │    - adds to log.attributes    │
│  • consoleLoggingIntegration│     │  • replayIntegration           │
│                           │       │  • consoleLoggingIntegration   │
└───────────────────────────┘       └────────────────────────────────┘
           │                                   │
           │                                   │
           └───────────────┬───────────────────┘
                           │
                           │ All events include companyId
                           ▼
               ┌────────────────────────────┐
               │      SENTRY PLATFORM       │
               │  • Tags: companyId, setBy  │
               │  • User: { id, email }     │
               │  • Log Attributes:         │
               │    - companyId             │
               └────────────────────────────┘
```

## Simplified Flow

### Server-Side (for API routes, server errors, server logs)

```
Request → middleware.ts → getCurrentUser() → Sentry.setUser() + Sentry.setTag('companyId')
                                                   ↓
          [Sentry Scope - Per-Request Isolated via AsyncLocalStorage]
                                                   ↓
                      API Routes / Server Code → console.log()
                                                   ↓
                      sentry.server.config.ts → beforeSendLog:
                                                   getCurrentScope().getScopeData().tags.companyId
                                                   ↓
                                             Sentry Dashboard
```

### Client-Side (for console logs, browser errors, Session Replay)

```
Page Load → layout.tsx → getCurrentUser() (from server session)
                      → SentryUserContext component receives user props
                      → Sentry.setTag('companyId')
                      → Sentry.setUser()
                      ↓
          [Sentry Client Scope - Per-Browser-Session]
                      ↓
         User actions → console.log()
                      ↓
         instrumentation-client.ts → beforeSendLog:
                                      getCurrentScope().getScopeData().tags.companyId
                                   ↓
                             Sentry Dashboard
```

## Key Points

1. **Cookie Storage**: `userId` stored in HTTP-only cookie (secure, can't be tampered with)
2. **Server Source of Truth**: User data retrieved from authenticated session via `getCurrentUser()`
3. **Security First**: Returns `null` when not authenticated (no default demo user fallback)
4. **Sentry Scope Mechanism**: Uses Sentry's built-in scope for storing companyId
   - **Server**: AsyncLocalStorage provides per-request isolation
   - **Client**: Browser scope provides per-session isolation
5. **Tags vs Attributes**:
   - **Tags**: Set via `Sentry.setTag()` - used for filtering/searching events
   - **Attributes**: Set in `beforeSendLog` - attached specifically to log entries
6. **beforeSendLog Hook**: Reads companyId from scope and adds to ALL console logs sent to Sentry
7. **No Custom Global Store**: Uses Sentry's native scope mechanism instead

## File Responsibilities

| File                                   | Purpose                                                       | Runs On |
| -------------------------------------- | ------------------------------------------------------------- | ------- |
| `src/lib/auth.ts`                      | Authentication, user lookup from cookie, returns null if none | Server  |
| `src/middleware.ts`                    | Intercept requests, set user + companyId in Sentry scope      | Edge    |
| `src/app/layout.tsx`                   | Get user data from session, pass to client component          | Server  |
| `src/components/SentryUserContext.tsx` | Set client Sentry user + companyId in scope                   | Client  |
| `src/app/api/*/route.ts`               | API routes set their own user + companyId in scope            | Server  |
| `src/instrumentation-client.ts`        | Client Sentry init + beforeSendLog hook                       | Client  |
| `sentry.server.config.ts`              | Server Sentry init + beforeSendLog hook                       | Server  |
| `sentry.edge.config.ts`                | Edge Sentry init (middleware)                                 | Edge    |
| `src/components/AuthDemo.tsx`          | Testing UI for login/logout                                   | Client  |
| `src/app/api/auth/route.ts`            | Login/logout API endpoint                                     | Server  |

## Data Flow Summary

**CompanyId Source**: Authenticated user session (HTTP-only cookie) → `MOCK_USERS` lookup → Returns `null` if not authenticated

**Server Events**:

- `middleware.ts` sets tags in Sentry scope → isolated per-request via AsyncLocalStorage
- API routes must set their own tags (separate execution context)

**Client Events**: `SentryUserContext.tsx` sets tags in Sentry scope → isolated per-browser-session

**Logs (both)**: `beforeSendLog` hooks read companyId from `getCurrentScope()` and add to log attributes automatically

**Security**: No global variables, uses Sentry's built-in scope isolation mechanisms
