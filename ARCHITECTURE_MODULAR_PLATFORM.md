# Modular Platform Architecture

## Executive Summary

Nurve has been transformed into an industrial-grade **modular platform operating system** built for long-term expansion, pluginization, scalability, and extreme maintainability.

**Architecture Type**: Modular Monolith  
**Design Pattern**: Event-Driven, Plugin-Based  
**Scalability**: Multi-tenant, enterprise-ready  

---

## Core Architecture Components

### 1. KERNEL SYSTEM (`/kernel`)

The kernel is the central orchestration layer responsible for:

- **Module Loading & Registration**
- **Event Bus (Pub/Sub)**
- **Permission System (RBAC)**
- **Plugin Lifecycle Management**
- **Configuration Management**
- **Queue & Worker Management**
- **Tenant Isolation**
- **Workflow Engine**

#### Kernel Services:

| Service | Purpose |
|---------|---------|
| `Kernel` | Central orchestrator, module lifecycle |
| `ModuleRegistry` | Module discovery, menus, routes, widgets |
| `EventBus` | Event-driven communication between modules |
| `PermissionSystem` | RBAC with tenant isolation |
| `ConfigService` | Configuration management |
| `QueueService` | Async job processing |
| `TenantService` | Multi-tenant context management |
| `WorkflowEngine` | Automation, triggers, actions |
| `KernelLogger` | Structured logging |

### 2. MODULE ARCHITECTURE

Every major feature is a module. Structure:

```
modules/
  module-name/
    backend/
      - module.ts          # Module implementation
      - services/          # Business logic
      - controllers/       # API endpoints
      - events/            # Event handlers
    frontend/
      - pages/             # Page components
      - components/        # Shared components
      - hooks/             # Custom hooks
    widgets/
      - WidgetName.tsx     # Widget components
    manifest.json          # Module declaration
```

#### Module Manifest (`manifest.json`):

```json
{
  "id": "crm",
  "name": "CRM Module",
  "version": "1.0.0",
  "description": "Customer relationship management",
  "dependencies": ["users", "notifications"],
  "permissions": ["crm.read", "crm.write"],
  "menus": [
    {
      "id": "crm",
      "label": "CRM",
      "icon": "Users",
      "path": "/crm",
      "order": 10
    }
  ],
  "routes": [
    {
      "id": "crm-dashboard",
      "path": "/crm",
      "component": "CrmDashboard"
    }
  ],
  "widgets": [
    {
      "id": "recent-contacts",
      "name": "Recent Contacts",
      "component": "RecentContactsWidget",
      "category": "dashboard"
    }
  ],
  "events": [
    {
      "name": "crm.contact.created",
      "description": "Contact created event",
      "payload": { "contactId": "string", "name": "string" }
    }
  ],
  "workflows": [
    {
      "id": "new-contact-welcome",
      "name": "Welcome New Contact",
      "triggers": ["crm.contact.created"],
      "actions": ["notification.send"]
    }
  ]
}
```

#### Base Module Class:

All modules extend `BaseModule`:

```typescript
import { BaseModule, IKernel, ModuleManifest } from '@/kernel';

export class CrmModule extends BaseModule {
  readonly manifest: ModuleManifest = {
    id: 'crm',
    name: 'CRM Module',
    version: '1.0.0',
    // ... manifest definition
  };

  async onInitialize(): Promise<void> {
    // Module setup
    this.on('user.login', this.handleUserLogin.bind(this));
  }

  async onShutdown(): Promise<void> {
    // Cleanup
  }

  async onHealthCheck(): Promise<boolean> {
    return true;
  }

  private async handleUserLogin(payload: any): Promise<void> {
    // Event handler
  }
}
```

### 3. EVENT-DRIVEN COMMUNICATION

**NO DIRECT MODULE COUPLING.**

```typescript
// GOOD: Emit event
await kernel.events.emit('crm.contact.created', {
  contactId: '123',
  name: 'John Doe',
});

// GOOD: Subscribe to event
kernel.events.on('crm.contact.created', async (payload, metadata) => {
  // Handle event
});

// BAD: Direct import (don't do this)
import { CrmService } from '../crm/crm.service'; // ❌
```

#### Event Bus Features:

- Typed events
- Async handlers
- Tenant-scoped events
- Event replay
- Subscription management

### 4. PERMISSION SYSTEM

Enterprise RBAC with tenant isolation:

```typescript
// Check permission
const canEdit = await kernel.permissions.can(
  { id: 'user123', roles: ['admin'] },
  'crm.contact.edit',
  { type: 'contact', id: '456', tenantId: 'tenant1' }
);

// Define role
kernel.permissions.defineRole('crm-admin', [
  'crm.*',
  'contacts.*',
  'deals.*',
]);
```

### 5. WORKFLOW ENGINE

Event-driven automation:

```typescript
// Define workflow
const workflow: Workflow = {
  id: 'new-lead-workflow',
  name: 'Process New Lead',
  trigger: {
    type: 'event',
    event: 'crm.lead.created',
  },
  conditions: [
    { id: 'c1', type: 'equals', field: 'lead.source', value: 'website' }
  ],
  actions: [
    { id: 'a1', type: 'notification', config: { message: 'New lead!' } },
    { id: 'a2', type: 'http', config: { url: '/api/enrich', method: 'POST' } },
    { id: 'a3', type: 'delay', config: { duration: 5000 } },
    { id: 'a4', type: 'email', config: { template: 'welcome' } },
  ],
};

// Register
await kernel.workflowEngine.registerWorkflow(workflow);
```

### 6. QUEUE & WORKERS

Async job processing:

```typescript
// Add job
const jobId = await kernel.queue.add('heavy-processing', {
  name: 'process-file',
  data: { fileId: '123' },
}, { tenantId: 'tenant1' });

// Process jobs
kernel.queue.process('heavy-processing', async (job) => {
  // Heavy processing here
  await job.progress(50); // Update progress
  // More processing
});
```

### 7. MULTI-TENANT FOUNDATION

Every operation is tenant-scoped:

```typescript
// Automatic tenant context
kernel.tenant.runWithContext('tenant-123', async () => {
  // All operations here are scoped to tenant-123
  const customers = await prisma.customer.findMany();
  // Only returns customers from tenant-123
});

// Tenant middleware for HTTP
app.use(kernel.tenant.createMiddleware());
```

---

## Frontend Dynamic UI Shell

### Auto-Registration System

No hardcoded sidebars. Everything is dynamic:

```typescript
// Kernel provides navigation tree
const navigation = kernel.modules.buildNavigationTree(tenantId, userPermissions);

// Renders dynamically
<DynamicSidebar items={navigation} />
```

### Widget System

```typescript
// Widget registration
kernel.modules.registerWidgetForTenant('crm', {
  id: 'recent-contacts',
  name: 'Recent Contacts',
  component: 'RecentContactsWidget',
  category: 'dashboard',
});

// Dynamic rendering
<WidgetGrid category="dashboard" tenantId={tenantId} />
```

### Route Registration

```typescript
// Routes auto-register from manifest
kernel.modules.registerRouteForTenant('crm', {
  id: 'crm-dashboard',
  path: '/crm',
  component: 'CrmDashboard',
});

// Dynamic router
<DynamicRouter routes={kernel.modules.getRoutesForTenant(tenantId)} />
```

---

## Module Development Guide

### Creating a New Module

1. **Create manifest** (`manifest.json`):

```json
{
  "id": "my-module",
  "name": "My Module",
  "version": "1.0.0",
  "dependencies": [],
  "menus": [],
  "routes": [],
  "widgets": [],
  "events": []
}
```

2. **Implement module class**:

```typescript
import { BaseModule } from '@/kernel';

export class MyModule extends BaseModule {
  readonly manifest = { /* manifest */ };

  async onInitialize(): Promise<void> {
    // Setup event handlers
    this.on('kernel.ready', () => {
      console.log('Kernel ready!');
    });
  }

  async onShutdown(): Promise<void> {
    // Cleanup
  }

  async onHealthCheck(): Promise<boolean> {
    return true;
  }
}
```

3. **Register with kernel**:

```typescript
// In app.module.ts
import { MyModule } from './modules/my-module';

const myModule = new MyModule();
await kernel.registerModule(myModule);
```

### Module Communication

```typescript
// Module A emits event
await this.emit('task.completed', { taskId: '123' });

// Module B listens
this.on('module-a.task.completed', async (payload) => {
  // Handle event
});
```

### Module Configuration

```typescript
// Get config
const apiKey = this.getConfig<string>('apiKey');
const timeout = this.getConfig<number>('timeout', 5000);
```

---

## Migration Strategy

### From Existing Code

1. **Identify feature boundaries**
2. **Create module structure**
3. **Move business logic to module services**
4. **Replace direct imports with events**
5. **Register module with kernel**

### Example Migration

**Before:**
```typescript
// Direct coupling
import { CrmService } from '../crm/crm.service';

export class DashboardService {
  constructor(private crm: CrmService) {}
  
  async getData() {
    const contacts = await this.crm.getContacts();
    return contacts;
  }
}
```

**After:**
```typescript
// Event-driven
export class DashboardModule extends BaseModule {
  async onInitialize(): Promise<void> {
    this.on('crm.contacts.updated', async (payload) => {
      // Handle contacts update
    });
  }
  
  async getData() {
    // Request data via event or API
    const contacts = await this.request('crm.contacts.get');
    return contacts;
  }
}
```

---

## Performance Considerations

### Lazy Loading

Modules load on-demand:

```typescript
// Only load when route accessed
const CrmModule = await import('./modules/crm');
await kernel.registerModule(new CrmModule.default());
```

### Event Optimization

- Batch event processing
- Debounce high-frequency events
- Use event filtering

### Module Isolation

- Each module has its own state
- No shared mutable state
- Clear boundaries

---

## Security

### Permission Boundaries

```typescript
// Every action checked
if (!await kernel.permissions.can(user, 'crm.delete', resource)) {
  throw new PermissionDeniedError('crm.delete', user.id);
}
```

### Tenant Isolation

```typescript
// Automatic scoping
kernel.tenant.runWithContext(tenantId, async () => {
  // All DB queries automatically filtered by tenant
});
```

### Module Sandboxing

- Modules can't access other modules directly
- Only communicate via events
- Kernel controls all interactions

---

## Observability

### Health Checks

```typescript
// Module health
const health = await kernel.healthCheck();
// Returns status of all modules
```

### Event Tracking

```typescript
// Event statistics
const stats = kernel.events.getStats();
// { totalEvents, activeSubscriptions, eventsByType }
```

### Queue Monitoring

```typescript
// Queue stats
const stats = kernel.queue.getAllStats();
// [ { name, pending, active, completed, failed } ]
```

---

## Future Extensions

### Plugin Marketplace

```typescript
// Install from marketplace
await kernel.installPlugin('marketplace-url');

// Enable/disable
await kernel.activateModuleForTenant('plugin-id', { tenantId: '123' });
```

### GraphQL Gateway

```typescript
// Auto-generated GraphQL schema
const schema = kernel.modules.buildGraphQLSchema();
```

### Distributed Workers

```typescript
// Redis-backed queue
kernel.queue.useRedis(redisClient);
```

---

## Summary

The Nurve platform is now:

- ✅ **Modular** - Every feature is a module
- ✅ **Event-Driven** - No direct coupling
- ✅ **Multi-Tenant** - Full isolation
- ✅ **Extensible** - Plugin architecture
- ✅ **Observable** - Health, metrics, logs
- ✅ **Secure** - RBAC, tenant boundaries
- ✅ **Scalable** - Queue-based processing
- ✅ **Maintainable** - Clear boundaries

**Ready for:**
- Rapid feature development
- Third-party plugins
- Enterprise scaling
- SaaS deployment
- AI integrations
- Workflow automation

---

*This architecture transforms Nurve from a web app into a platform operating system.*
