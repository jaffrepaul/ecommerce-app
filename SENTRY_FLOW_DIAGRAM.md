# Sentry CompanyId Flow Diagram

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
                    │  • getCompanyIdFromSession()  │
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
        │         • Reads companyId from session          │
        └─────────────────────────────────────────────────┘
                        │                       │
                        │                       │ Pass as prop
            (Server)    │                       │    (Client)
                        │                       │
                        ▼                       ▼
        ┌───────────────────────────┐   ┌────────────────────────────────┐
        │  src/middleware.ts        │   │  src/components/               │
        │  (Edge Middleware)        │   │  SentryUserContext.tsx         │
        │  • Runs on every request  │   │  (Client Component)            │
        │  • getCompanyIdFromSession│   │  • Receives companyId prop     │
        │  • Sentry.setTag()        │   │  • setClientCompanyId()        │
        │  • Sentry.setContext()    │   │  • Sentry.setUser()            │
        │                           │   │  • Sentry.setTag()             │
        └───────────────────────────┘   └────────────────────────────────┘
                        │                       │
                        │                       │ Stores in global var
                        │                       ▼
                        │           ┌────────────────────────────────┐
                        │           │  src/lib/sentryContext.ts      │
                        │           │  • let currentCompanyId        │
                        │           │  • setClientCompanyId()        │
                        │           │  • getClientCompanyId()        │
                        │           └────────────────────────────────┘
                        │                       │
                        ▼                       ▼

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
│    - reads companyId      │       │    - getClientCompanyId()      │
│      from scope tags      │       │    - adds to log.attributes    │
│    - adds to log.attributes│      │                                │
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
                │  • Contexts: company       │
                │  • Log Attributes:         │
                │    - companyId             │
                │    - setBy                 │
                └────────────────────────────┘
```

## Simplified Flow

### Server-Side (for API routes, server errors, server logs)

```
Request → middleware.ts → getCompanyIdFromSession() → Sentry.setTag('companyId')
                                                    ↓
                       API Routes / Server Code → console.log()
                                                    ↓
                       sentry.server.config.ts → beforeSendLog (adds companyId to logs)
                                                    ↓
                                              Sentry Dashboard
```

### Client-Side (for console logs, browser errors, Session Replay)

```
Page Load → layout.tsx → getCurrentUser() (from server session)
                       → SentryUserContext component receives companyId prop
                       → setClientCompanyId() stores in global var
                       → Sentry.setTag('companyId')
                       → Sentry.setUser()
                       ↓
          User actions → console.log()
                       ↓
          instrumentation-client.ts → beforeSendLog (adds companyId to logs)
                                    ↓
                              Sentry Dashboard
```

## Key Points

1. **Cookie Storage**: `userId` stored in HTTP-only cookie (secure, can't be tampered with)
2. **Server Source of Truth**: CompanyId retrieved from authenticated session via `getCompanyIdFromSession()`
3. **Two Parallel Paths**: Separate handling for client and server, both ultimately set companyId
4. **Tags vs Attributes**:
   - **Tags**: Set via `Sentry.setTag()` - used for filtering/searching events
   - **Attributes**: Set in `beforeSendLog` - attached specifically to log entries
5. **beforeSendLog Hook**: Automatically adds companyId to ALL console logs sent to Sentry
6. **Global Store**: `sentryContext.ts` bridges SentryUserContext and beforeSendLog on client-side

## File Responsibilities

| File                                   | Purpose                                      | Runs On |
| -------------------------------------- | -------------------------------------------- | ------- |
| `src/lib/auth.ts`                      | Authentication, companyId lookup from cookie | Server  |
| `src/middleware.ts`                    | Intercept requests, set companyId tags       | Edge    |
| `src/app/layout.tsx`                   | Get user data from session, pass to client   | Server  |
| `src/components/SentryUserContext.tsx` | Set client Sentry user + companyId context   | Client  |
| `src/lib/sentryContext.ts`             | Global store for client companyId            | Client  |
| `src/instrumentation-client.ts`        | Client Sentry init + beforeSendLog hook      | Client  |
| `sentry.server.config.ts`              | Server Sentry init + beforeSendLog hook      | Server  |
| `sentry.edge.config.ts`                | Edge Sentry init (middleware)                | Edge    |
| `src/components/AuthDemo.tsx`          | Testing UI for login/logout                  | Client  |
| `src/app/api/auth/route.ts`            | Login/logout API endpoint                    | Server  |

## Data Flow Summary

**CompanyId Source**: Authenticated user session (HTTP-only cookie) → `MOCK_USERS` lookup

**Server Events**: `middleware.ts` sets tags → available to all server-side code
**Client Events**: `SentryUserContext.tsx` sets tags → available to all client-side code
**Logs (both)**: `beforeSendLog` hooks add companyId to log attributes automatically
