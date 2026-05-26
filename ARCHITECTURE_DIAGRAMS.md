# Architecture Diagrams

This document contains visual diagrams of the Nurve system architecture.

## System Overview

```mermaid
graph TB
    subgraph Client
        A[Next.js 16 App]
        B[React Query]
        C[Zustand Store]
        D[Socket.io Client]
    end

    subgraph "API Gateway"
        E[NestJS Gateway]
        F[JWT Auth Guard]
        G[Firebase Validation]
        H[Request Router]
    end

    subgraph "Microservices"
        I[Marketplace Service]
        J[Kernel Modules]
        K[Workflow Engine]
        L[Queue Service]
    end

    subgraph "External Services"
        M[Firebase Auth]
        N[Firebase Storage]
        O[FCM Push]
    end

    subgraph "Data Layer"
        P[(PostgreSQL)]
        Q[Prisma ORM]
    end

    A -->|HTTP/REST| E
    A -->|WebSocket| E
    B --> A
    C --> A
    D --> E
    
    E --> F
    F --> G
    G --> M
    E --> H
    
    H --> I
    H --> J
    J --> K
    J --> L
    
    E --> Q
    I --> Q
    Q --> P
    
    E --> M
    A --> N
    A --> O
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant F as Firebase Auth
    participant G as Gateway
    participant DB as Database

    U->>C: Enter credentials
    C->>F: Sign in with email/password
    F-->>C: Firebase ID Token
    
    C->>G: POST /auth/login<br/>{firebaseToken}
    
    G->>F: Verify ID Token
    F-->>G: Token valid
    
    G->>DB: Get or create user
    DB-->>G: User record
    
    G->>G: Generate JWT Access Token
    G->>G: Generate Refresh Token
    G->>DB: Store session
    
    G-->>C: {accessToken, refreshToken, user}
    
    Note over C: Store tokens securely
    
    C->>C: Set auth state
    C-->>U: Redirect to dashboard
    
    loop Subsequent Requests
        C->>G: Request with Bearer token
        G->>G: Validate JWT
        G-->>C: Protected data
    end
```

## Module Architecture (Kernel System)

```mermaid
graph TB
    subgraph "Kernel Core"
        K[Kernel]
        MR[Module Registry]
        EB[Event Bus]
        PS[Permission System]
        QS[Queue Service]
        TS[Tenant Service]
        WE[Workflow Engine]
        CS[Config Service]
        KL[Kernel Logger]
    end

    subgraph "Registered Modules"
        M1[Auth Module]
        M2[User Module]
        M3[Notification Module]
        M4[Settings Module]
        M5[Future: Marketplace]
        M6[Future: Analytics]
    end

    subgraph "Communication"
        E1[Event: user.login]
        E2[Event: notification.send]
        E3[Event: settings.changed]
    end

    K --> MR
    K --> EB
    K --> PS
    K --> QS
    K --> TS
    K --> WE
    K --> CS
    K --> KL

    MR --> M1
    MR --> M2
    MR --> M3
    MR --> M4

    M1 -.->|emits| E1
    M2 -.->|emits| E1
    M3 -.->|handles| E2
    M4 -.->|emits| E3

    EB -.->|routes| E1
    EB -.->|routes| E2
    EB -.->|routes| E3

    PS -.->|checks| M1
    PS -.->|checks| M2
    PS -.->|checks| M3
    PS -.->|checks| M4

    TS -.->|context| M1
    TS -.->|context| M2
    TS -.->|context| M3
    TS -.->|context| M4
```

## Request Lifecycle

```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant A as Auth Guard
    participant F as Firebase
    participant S as Service
    participant P as Prisma
    participant DB as PostgreSQL

    C->>G: HTTP Request + JWT
    
    G->>A: Validate token
    
    alt Token Valid
        A->>G: User context
        G->>S: Route request
        
        S->>P: Database query
        P->>DB: SQL
        DB-->>P: Results
        P-->>S: Data
        
        S-->>G: Response
        G-->>C: JSON Response
    else Token Invalid
        A->>G: 401 Unauthorized
        G-->>C: Error: Invalid token
    end
```

## Queue Processing Flow

```mermaid
graph LR
    A[Job Creator] -->|add job| B[Queue Service]
    B -->|store| C[(Job Queue)]
    D[Worker Process] -->|poll| B
    B -->|fetch| C
    C -->|next job| D
    D -->|process| E[Job Handler]
    E -->|success| F[Mark Complete]
    E -->|fail| G[Retry Logic]
    G -->|retry| C
    G -->|max retries| H[Dead Letter Queue]
    
    style A fill:#e1f5fe
    style D fill:#fff3e0
    style H fill:#ffebee
```

## Database Schema Overview

```mermaid
erDiagram
    USER ||--o{ SESSION : has
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ ACTIVITY_LOG : generates
    USER ||--o{ MESSAGE : sends
    USER ||--o{ CONVERSATION : participates
    
    USER {
        string id PK
        string email
        string firebaseUid
        string name
        string role
        boolean twoFactorEnabled
        datetime createdAt
        datetime updatedAt
    }
    
    SESSION {
        string id PK
        string userId FK
        string refreshToken
        string ipAddress
        string userAgent
        datetime expiresAt
        datetime createdAt
    }
    
    NOTIFICATION {
        string id PK
        string userId FK
        string type
        string title
        string content
        boolean read
        jsonb metadata
        datetime createdAt
    }
    
    ACTIVITY_LOG {
        string id PK
        string userId FK
        string action
        string details
        string ipAddress
        datetime createdAt
    }
    
    CONVERSATION {
        string id PK
        string[] participantIds
        string lastMessage
        datetime updatedAt
        datetime createdAt
    }
    
    MESSAGE {
        string id PK
        string conversationId FK
        string senderId FK
        string content
        datetime createdAt
    }
```

## Real-time Communication

```mermaid
graph TB
    subgraph "Client A"
        A1[Socket.io Client]
    end

    subgraph "Client B"
        B1[Socket.io Client]
    end

    subgraph "Gateway Server"
        S[Socket.io Server]
        NS[Notification Service]
        MS[Messaging Service]
    end

    subgraph "Events"
        E1[new:message]
        E2[notification]
        E3[user:typing]
    end

    A1 <-->|WebSocket| S
    B1 <-->|WebSocket| S
    
    S -->|handles| NS
    S -->|handles| MS
    
    NS -.->|emits| E2
    MS -.->|emits| E1
    MS -.->|emits| E3
    
    E1 -->|broadcast| B1
    E2 -->|broadcast| A1
    E3 -->|broadcast| B1
```

## Scraper Architecture (Planned)

```mermaid
graph TB
    subgraph "Scheduler"
        S[Cron Scheduler]
        Q[Job Queue]
    end

    subgraph "Scraper Workers"
        W1[Worker 1]
        W2[Worker 2]
        W3[Worker N]
    end

    subgraph "External Sources"
        E1[Website A]
        E2[Website B]
        E3[API Source]
    end

    subgraph "Data Processing"
        P[Parser/Cleaner]
        D[Deduplicator]
        V[Validator]
    end

    subgraph "Storage"
        DB[(PostgreSQL)]
        CACHE[(Redis Cache)]
    end

    S -->|enqueue| Q
    Q -->|distribute| W1
    Q -->|distribute| W2
    Q -->|distribute| W3

    W1 -->|fetch| E1
    W2 -->|fetch| E2
    W3 -->|fetch| E3

    W1 --> P
    W2 --> P
    W3 --> P

    P --> D
    D --> V
    V --> DB
    V --> CACHE
```

## Multi-tenancy Architecture (Future)

```mermaid
graph TB
    subgraph "Request Layer"
        R[HTTP Request]
        M[Tenant Middleware]
    end

    subgraph "Tenant Context"
        C[AsyncLocalStorage]
        I[Tenant ID]
        S[Schema/Config]
    end

    subgraph "Application"
        A[Controllers]
        SV[Services]
        P[Prisma Client]
    end

    subgraph "Data Isolation"
        DB[(PostgreSQL)]
        T1[Tenant A Data]
        T2[Tenant B Data]
        T3[Tenant C Data]
    end

    R --> M
    M --> C
    C --> I
    C --> S

    A --> C
    SV --> C
    P --> C

    P -->|scoped query| DB
    DB --> T1
    DB --> T2
    DB --> T3

    style T1 fill:#e3f2fd
    style T2 fill:#f3e5f5
    style T3 fill:#e8f5e9
```

## Workflow Engine

```mermaid
graph TB
    subgraph "Workflow Definition"
        W[Workflow Config]
        T[Trigger]
        C[Conditions]
        A[Actions]
    end

    subgraph "Execution"
        E[Workflow Engine]
        Q[Execution Queue]
        X[Executor]
    end

    subgraph "Actions"
        A1[Notification]
        A2[HTTP Request]
        A3[Delay/Wait]
        A4[Log/Event]
        A5[Custom Function]
    end

    W --> T
    W --> C
    W --> A

    T -->|fires| E
    E --> Q
    Q --> X

    C -.->|check| X
    X --> A1
    X --> A2
    X --> A3
    X --> A4
    X --> A5

    A1 -->|result| X
    A2 -->|result| X
    A3 -->|result| X
```

## Deployment Architecture (Development)

```mermaid
graph TB
    subgraph "Development Environment"
        C[Next.js Dev Server<br/>localhost:3000]
        G[NestJS Gateway<br/>localhost:4000]
        M[Marketplace Service<br/>localhost:3001]
        P[(PostgreSQL<br/>localhost:5432)]
    end

    subgraph "External"
        F[Firebase<br/>Authentication]
        S[Firebase<br/>Storage]
    end

    C -->|API calls| G
    C -->|WebSocket| G
    G -->|Microservice| M
    G --> P
    M --> P
    G --> F
    C --> S
    C --> F
```

## Error Handling Flow

```mermaid
graph TD
    A[Request] --> B{Auth Valid?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D[Process Request]
    
    D --> E{Error Occurs?}
    E -->|No| F[Return Data]
    E -->|Yes| G{Error Type}
    
    G -->|Validation| H[400 Bad Request]
    G -->|Not Found| I[404 Not Found]
    G -->|Server Error| J[500 Internal Error]
    G -->|Rate Limit| K[429 Too Many Requests]
    
    C --> L[Client Error Handler]
    H --> L
    I --> L
    J --> M[Error Logger]
    K --> L
    F --> N[Client Success Handler]
    
    M --> O[Alerting/Monitoring]
    
    style C fill:#ffebee
    style H fill:#ffebee
    style I fill:#ffebee
    style J fill:#ffebee
    style K fill:#ffebee
    style F fill:#e8f5e9
```

---

*Note: These diagrams use Mermaid syntax. View them in a Markdown viewer that supports Mermaid (like GitHub, GitLab, or VS Code with extensions).*
