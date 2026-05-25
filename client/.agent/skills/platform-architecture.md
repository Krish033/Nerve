# Platform Architecture Standards

Permanent engineering source of truth for the Nurve client application.
Every feature, refactor, or addition must follow these rules.

---

## Navigation Philosophy

### Primary sidebar rail (`w-14`)
- Only core workspace destinations: **Dashboard, Tasks, GitHub** (and future modules)
- Bottom utility group: **Search trigger (⌘K), Notifications, Settings, Sign out, Profile avatar**
- No Marketplace, no Search as a nav item — these are command-driven
- Adding a new module to the sidebar requires registering it in `lib/modules/registry.ts` with `inSidebar: true`

### Command Palette (`⌘K`)
- Primary navigation surface for everything not in the sidebar rail
- Covers: all routes, settings pages, actions, documentation, search
- Items defined in `components/layouts/CommandPalette.tsx` and driven by `lib/modules/registry.ts`
- Must support keyboard-only operation: ArrowUp/Down, Enter, Escape
- Mouse hover must sync `selectedIndex` (no dual-cursor state)

### Secondary sidebar (`w-56`)
- Contextual: only appears when the current route has registered submenus
- Submenus defined in `components/layouts/SecondarySidebar.tsx`
- Labels: sentence-case, no uppercase, no thematic names
- New route sections must add a submenu entry keyed by route prefix

### No top Navbar
- The `Navbar` component has been removed from `AdminLayout`
- Breadcrumbs rendered via `Breadcrumbs` component inside the main content area
- Search is exclusively `⌘K` — no search bar in the header

---

## Module System

Modules are registered in `lib/modules/registry.ts`.

```ts
type AppModule = {
  id: ModuleId;
  label: string;
  href: string;
  icon: LucideIcon;
  featureFlag?: string;   // gates visibility
  inSidebar?: boolean;
  inCommandPalette?: boolean;
  keywords?: string[];
};
```

- Every new top-level feature is a module with an entry in the registry
- Sidebar and CommandPalette must be driven by the registry, not hardcoded arrays
- Feature flags gate module visibility (see Feature Flags section)

---

## Feature Flags

Store: `lib/store/use-feature-flags.ts`

```ts
const { isEnabled } = useFeatureFlags();
if (!isEnabled('github_integration')) return null;
```

- All experimental or gated features must be wrapped in a feature flag
- Default flag values live in the store — no server dependency for flags yet
- Future: flags will be fetched from the backend on session init

---

## Expandability Standards

### Adding a new feature module
1. Create route in `app/<module>/page.tsx`
2. Register in `lib/modules/registry.ts`
3. Add submenu in `SecondarySidebar.tsx` if the module has sub-pages
4. Add command palette items if the module has sub-routes
5. Gate behind a feature flag if experimental

### State management
- **Global auth state**: `lib/store/useAuth.ts` (Zustand)
- **Layout preferences**: `lib/store/use-layout-store.ts` (Zustand + persist)
- **Feature flags**: `lib/store/use-feature-flags.ts` (Zustand + persist)
- **Server state**: TanStack Query — all API data lives in query cache
- **Local UI state**: `useState` / `useReducer` inside components — never lifted to global store unless truly shared
- No Redux. No Context API for data fetching.

### API layer
- All requests go through `lib/api.ts` (Axios instance with interceptors)
- Token refresh handled automatically via the response interceptor
- Never call `fetch()` directly — always use the `api` instance
- All API calls wrapped in TanStack Query `useQuery` / `useMutation`

---

## UI Composition Standards

### Layout
- `AdminLayout` wraps all authenticated pages — never nest `AdminLayout` inside itself
- Route layouts (e.g., `app/profile/layout.tsx`) must NOT add their own `AdminLayout` wrapper
- Page-level padding: `px-6 py-6 md:px-8 md:py-8` applied by `AdminLayout`
- Max content width: `max-w-5xl mx-auto` — override only for full-bleed pages with explicit justification

### Components
- **Page titles**: `<PageHeader title="..." description="..." actions={...} />`
- **Section grouping**: `<SectionCard title="...">` 
- **Status indicators**: `<StatusBadge status="..." />`
- **Empty states**: `<EmptyState icon={<Icon />} title="..." description="..." action={...} />`
- **Loading**: `<LoadingSkeleton />` — never use inline `animate-pulse` divs
- **Buttons**: `size="sm"` default in page content, `size="default"` for primary CTAs only

### Typography scale
| Use | Class |
|-----|-------|
| Page title | `text-xl font-semibold tracking-tight` |
| Section title | `text-sm font-semibold` |
| Body | `text-sm` |
| Captions / labels | `text-xs text-muted-foreground` |
| Micro labels | `text-[11px] font-medium` |

- Never use `font-black`, `uppercase tracking-widest` for UI labels
- Never use `text-[8px]` or `text-[9px]` — unreadable

### Colors
- All colors via CSS tokens — never hardcode `text-blue-500`, `bg-gray-100` etc.
- Use: `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-muted`, `border-border`, `text-primary`
- Status colors: `text-emerald-600 dark:text-emerald-400` for success, `text-destructive` for errors, `text-amber-600` for warnings

### Spacing
- Multiples of 4px only: `gap-1 gap-2 gap-3 gap-4 gap-6 gap-8`
- Section spacing: `space-y-6` between major page sections
- Card padding: `p-5` or `p-6`

### Borders & Radius
- Cards: `rounded-xl`
- Buttons, inputs, badges: `rounded-md`
- Small indicators: `rounded-full`
- Never use `rounded-none`, `rounded-[2px]`, `rounded-[4px]` — use the system values

---

## Performance Standards

### Rendering
- Memoize expensive computations with `useMemo`
- Memoize stable callbacks with `useCallback`
- Wrap pure presentational components with `React.memo` only when profiling confirms benefit
- Never memo everything blindly — it adds overhead
- Use `Suspense` + `loading.tsx` for route-level loading states

### Data fetching
- Use TanStack Query `staleTime` appropriately — avoid refetching on every focus for stable data
- Use `placeholderData: keepPreviousData` for paginated queries
- Batch API calls where possible — avoid waterfalls in `useEffect`

### Bundle
- No barrel imports from large libraries (`import * from 'lucide-react'` is banned — use named imports)
- Dynamic import (`next/dynamic`) for heavy components: rich editors, charts, modals
- Keep page components lean — extract logic into hooks in `lib/hooks/`

---

## Testing Standards

### Unit tests
- Tool: Vitest
- Location: co-located `*.test.ts` files
- Cover: store logic, utility functions, data transformations

### Component tests
- Tool: Vitest + Testing Library
- Cover: user interactions, conditional rendering, accessibility

### E2E tests
- Tool: Playwright
- Location: `tests/e2e/`
- Cover: auth flows, navigation, critical user journeys
- Must run in CI on every PR

### Accessibility
- Run `axe-core` on all page-level components
- All interactive elements must be keyboard-reachable
- All icons used as buttons must have `aria-label` or `title`
- No `outline: none` without a visible focus replacement

---

## GitHub Integration Architecture

Module ID: `github`  
Feature flag: `github_integration`  
Route prefix: `/github`

### Planned surfaces
- `/github` — Repository list
- `/github/commits` — Commit timeline
- `/github/workflows` — Workflow run viewer
- `/github/connect` — OAuth connection flow

### OAuth flow
- GitHub OAuth App (or GitHub App) — client ID stored in env
- Exchange code for token server-side via `/api/github/oauth/callback`
- Token stored server-side, never exposed to the client
- Client uses `/api/github/*` proxy routes

### Data model
```ts
type GitHubRepo = {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
  language?: string;
};

type WorkflowRun = {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | null;
  createdAt: string;
  headBranch: string;
};
```

---

## Security Rules

- All authenticated routes wrapped in `<ProtectedRoute>` via `AdminLayout`
- Never store sensitive tokens in `localStorage` — use `httpOnly` cookies for refresh tokens
- Access tokens in Zustand memory only (cleared on tab close)
- All forms must validate with Zod before submission
- API errors must never be surfaced raw to the user — use `getErrorMessage()` utility

---

## Realtime Standards

- Socket.io client initialized in `lib/store/useMessaging.ts`
- Realtime events must update TanStack Query cache directly via `queryClient.setQueryData`
- Never poll when a websocket event is available
- Socket connection must reconnect automatically (socket.io handles this)
- Notification unread counts updated via socket events → `useNotifications` provider

---

## DX Rules

- All new files must be TypeScript — no `.js` files in `app/` or `components/`
- Shared types go in `@types/` or co-located with the module
- No `any` types without an explicit comment explaining why
- Environment variables validated at startup — add to `.env` and document in `.env.example`
- Lint: `eslint` + `eslint-config-next` — fix all warnings before merging
- No `console.log` in committed code — use structured logging or remove

---

## Observability Conventions

- Errors caught in boundaries logged with context: `{ component, route, userId }`
- API errors include status code, endpoint, and sanitized message
- Performance-sensitive operations timed with `performance.mark()`
- Future: OpenTelemetry traces for frontend spans

---

## Anti-patterns (Banned)

| Pattern | Reason |
|---------|--------|
| `rounded-none`, `rounded-[2px]` | Breaks design system radius |
| `font-black uppercase tracking-widest` on labels | Industrial thematic style — removed |
| Hardcoded color values (`text-blue-500`) | Use CSS tokens |
| `bg-white/[0.02]` opacity hacks | Use `bg-muted` or `bg-card` |
| `chamfer-card`, `chamfer-button` classes | Legacy industrial theme — deleted |
| Nesting `AdminLayout` inside a route layout | Double sidebar / double padding |
| `import * as Icons from 'lucide-react'` | Bloats bundle |
| Calling `fetch()` directly | Use `lib/api.ts` |
| Lifting all state to Zustand | Use TanStack Query for server state |
| `console.log` in production code | Use error boundaries and logging |
