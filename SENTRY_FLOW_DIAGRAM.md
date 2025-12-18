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
        ┌───────────────────────┐   ┌────────────────────────────────┐
        │  src/middleware.ts    │   │  src/components/               │
        │  (Edge Middleware)    │   │  SentryUserContext.tsx         │
        │  • Runs on every req  │   │  (Client Component)            │
        │  • Reads cookie       │   │  • Receives companyId prop     │
        │  • getCompanyId()     │   │  • setClientCompanyId()        │
        │  • Sentry.setTag()    │   │  • Sentry.setTag()             │
        └───────────────────────┘   └────────────────────────────────┘
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
│  • beforeSendLog hook     │       │  • beforeSendLog hook          │
│    - reads from scope     │       │    - getClientCompanyId()      │
│    - adds to attributes   │       │    - adds to attributes        │
└───────────────────────────┘       └────────────────────────────────┘
            │                                   │
            │                                   │
            └───────────────┬───────────────────┘
                            │
                            │ Both add companyId
                            ▼
                ┌────────────────────────────┐
                │      SENTRY PLATFORM       │
                │  • Logs with companyId     │
                │  • Tags: companyId, setBy  │
                │  • Attributes: companyId   │
                └────────────────────────────┘
```

## Simplified Flow

### Server-Side (for API routes, server errors)

```
Request → middleware.ts → auth.ts → Sentry.setTag() → sentry.server.config.ts
                                                    → beforeSendLog
                                                    → Sentry Dashboard
```

### Client-Side (for console logs, browser errors, Session Replay)

```
Page Load → layout.tsx → getCurrentUser() → SentryUserContext.tsx
                                          → sentryContext.ts (store)
                                          → instrumentation-client.ts
                                          → beforeSendLog
                                          → Sentry Dashboard
```

## Key Points

1. **Cookie Storage**: `userId` stored in HTTP-only cookie (secure)
2. **Server Source of Truth**: CompanyId comes from `auth.ts` mock database
3. **Two Paths**: Separate but parallel handling for client and server
4. **beforeSendLog**: The magic hook that adds companyId to all logs
5. **Global Store**: `sentryContext.ts` bridges SentryUserContext and beforeSendLog

## File Responsibilities

| File                                   | Purpose                             | Runs On     |
| -------------------------------------- | ----------------------------------- | ----------- |
| `src/lib/auth.ts`                      | Authentication, companyId lookup    | Server      |
| `src/middleware.ts`                    | Intercept requests, set Sentry tags | Edge/Server |
| `src/app/layout.tsx`                   | Get user data, pass to client       | Server      |
| `src/components/SentryUserContext.tsx` | Set client Sentry context           | Client      |
| `src/lib/sentryContext.ts`             | Store companyId for client          | Client      |
| `src/instrumentation-client.ts`        | Sentry init + beforeSendLog         | Client      |
| `sentry.server.config.ts`              | Sentry init + beforeSendLog         | Server      |
| `src/components/AuthDemo.tsx`          | Testing UI                          | Client      |
| `src/app/api/auth/route.ts`            | Login/logout API                    | Server      |
