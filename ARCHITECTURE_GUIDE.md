# Nurve Platform - Architecture & Developer Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Performance-First Development](#performance-first-development)
4. [State Management Patterns](#state-management-patterns)
5. [API Integration](#api-integration)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Quick Start

### For New Features:
```typescript
// 1. Use optimized stores with selectors
import { useAuthUser, useAuthActions } from '@/lib/store/use-auth-optimized';

// 2. Use optimized API client
import { api } from '@/lib/store/use-api-optimized';

// 3. Wrap components with error boundaries
import { ErrorBoundary } from '@/components/shared/error-boundary-enhanced';

// 4. Use performance utilities
import { useDebounce, useThrottle } from '@/lib/utils/performance';
```

---

## Architecture Overview

### Provider Hierarchy (Optimized)
```
QueryClientProvider
├── AuthProvider (Optimized)
├── NotificationProvider
├── ThemeProvider
├── MarketplaceProvider
└── ThemeColorProvider (Optimized)
    ├── AppMetaSync
    ├── RouteProgressBar
    └── ErrorBoundary (Enhanced)
        └── {children}
```

### Data Flow
1. **Server State**: React Query (TanStack) with automatic caching
2. **Client State**: Zustand with selector-based subscriptions
3. **Theme State**: Optimized provider with memoized CSS variables
4. **Auth State**: Optimized store with granular selectors

---

## Performance-First Development

### ✅ DO: Use Selector Hooks
```typescript
// GOOD: Component only re-renders when user changes
const user = useAuthUser();

// GOOD: Component only re-renders when loading state changes
const { isLoading } = useAuthStatus();

// GOOD: Actions are stable references
const { setUser } = useAuthActions();
```

### ❌ DON'T: Subscribe to Entire Store
```typescript
// BAD: Component re-renders on ANY auth state change
const { user, isLoading, accessToken } = useAuthStore();
```

### ✅ DO: Memoize Expensive Computations
```typescript
import { useMemo } from 'react';

const filteredData = useMemo(() => {
  return data.filter(item => item.active);
}, [data]);
```

### ✅ DO: Debounce User Input
```typescript
import { useDebounce } from '@/lib/utils/performance';

const debouncedSearch = useDebounce((query: string) => {
  performSearch(query);
}, 300);
```

### ✅ DO: Use Error Boundaries
```typescript
<ErrorBoundary 
  fallback={<ErrorFallback />}
  onError={(error) => logger.error('Component failed', { error })}
>
  <YourComponent />
</ErrorBoundary>
```

---

## State Management Patterns

### Auth State Pattern
```typescript
import { 
  useAuthUser, 
  useAuthStatus, 
  useAuthActions,
  useIsAuthenticated 
} from '@/lib/store/use-auth-optimized';

function UserProfile() {
  // Only re-renders when user data changes
  const user = useAuthUser();
  
  // Only re-renders when loading/initialized changes
  const { isLoading, isInitialized } = useAuthStatus();
  
  // Stable action references
  const { logout } = useAuthActions();
  
  // Memoized auth check
  const isAuthenticated = useIsAuthenticated();
  
  if (!isInitialized) return <Skeleton />;
  if (!isAuthenticated) return <LoginPrompt />;
  
  return (
    <div>
      <h1>{user?.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Theme State Pattern
```typescript
import { 
  useActiveTheme, 
  useThemeActions,
  useThemeConfig 
} from '@/lib/store/use-theme-optimized';

function ThemeSettings() {
  const theme = useActiveTheme();
  const { setActiveTheme } = useThemeActions();
  const config = useThemeConfig();
  
  return (
    <div style={{ 
      background: config.accentColor,
      fontFamily: theme?.config?.fontFamily 
    }}>
      {/* Theme UI */}
    </div>
  );
}
```

### Custom Store Pattern (For New Features)
```typescript
// stores/use-feature-store.ts
import { create } from 'zustand';

interface FeatureState {
  data: SomeType[];
  selectedId: string | null;
}

const useFeatureStoreBase = create<FeatureState & FeatureActions>()(
  persist(
    (set) => ({...}),
    { name: 'feature-storage' }
  )
);

// Export selector-based hooks
export function useFeatureData() {
  return useFeatureStoreBase((state) => state.data);
}

export function useSelectedFeature() {
  return useFeatureStoreBase((state) => 
    state.data.find(item => item.id === state.selectedId)
  );
}
```

---

## API Integration

### Basic API Calls
```typescript
import { api, withRetry } from '@/lib/api-optimized';

// GET with automatic caching
const themes = await api.get<Theme[]>('/marketplace/themes');

// POST with cache invalidation
await api.post('/marketplace/users/${userId}/themes/${themeId}/install');

// PUT with retry logic
await withRetry(
  () => api.put('/settings/profile', data),
  { maxRetries: 3, baseDelay: 1000 }
);
```

### API with React Query
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch with caching
function useThemes() {
  return useQuery({
    queryKey: ['themes'],
    queryFn: () => api.get<Theme[]>('/marketplace/themes'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Mutation with optimistic updates
function useInstallTheme() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (themeId: string) => 
      api.post(`/marketplace/users/${userId}/themes/${themeId}/install`),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['installed-themes'] });
    },
  });
}
```

---

## Error Handling

### Structured Error Logging
```typescript
import { logger } from '@/lib/logger-enhanced';

// Basic error logging
logger.error('Operation failed', { 
  error, 
  context: { userId, operation } 
});

// Performance logging
logger.perf('Data fetch', 150, { 
  endpoint: '/api/themes',
  cache: 'miss' 
});

// User action tracking
logger.track('theme_installed', { 
  themeId, 
  userId 
});

// API call logging (automatic)
// Done by api-optimized.ts interceptor
```

### Error Boundary Usage
```typescript
// Page-level error boundary
export default function MarketplacePage() {
  return (
    <ErrorBoundary
      fallback={<ErrorPage message="Failed to load marketplace" />}
      resetKeys={[user?.id]}
      resetOnPropsChange
    >
      <MarketplaceContent />
    </ErrorBoundary>
  );
}

// Component-level error boundary
function ThemeCard({ theme }: { theme: Theme }) {
  return (
    <ErrorBoundary
      fallback={<div className="error-card">Preview unavailable</div>}
    >
      <ThemePreview theme={theme} />
    </ErrorBoundary>
  );
}
```

---

## Best Practices

### Component Optimization Checklist
- [ ] Use selector hooks instead of full store access
- [ ] Wrap expensive computations in `useMemo`
- [ ] Stabilize callbacks with `useCallback`
- [ ] Debounce user input handlers
- [ ] Use `React.memo` for pure components
- [ ] Implement proper loading states
- [ ] Add error boundaries

### Performance Monitoring
```typescript
import { useRenderPerf } from '@/lib/utils/performance';

function ExpensiveComponent() {
  // Logs warning in dev if render takes >16ms
  useRenderPerf('ExpensiveComponent');
  
  return <div>...</div>;
}
```

### Database Query Optimization
```typescript
// Use Prisma's select to minimize data transfer
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, name: true, email: true }, // Only needed fields
});

// Use include efficiently
const themes = await prisma.userInstalledItem.findMany({
  where: { userId },
  include: { item: { select: { id: true, name: true, config: true } } },
});
```

### Caching Strategy
1. **API Level**: React Query with stale-while-revalidate
2. **Store Level**: Zustand persistence (selective)
3. **Component Level**: Memoization with useMemo
4. **DOM Level**: CSS variable caching in theme provider

---

## Migration Guide

### From Old Auth Store
```typescript
// Before
const { user, setUser, isLoading } = useAuthStore();

// After
const user = useAuthUser();
const { setUser } = useAuthActions();
const { isLoading } = useAuthStatus();
```

### From Old Theme Store
```typescript
// Before
const { activeTheme, installedThemes, setActiveTheme } = useThemeStore();

// After
const activeTheme = useActiveTheme();
const installedThemes = useInstalledThemes();
const { setActiveTheme } = useThemeActions();
```

### From Old API Client
```typescript
// Before
const res = await fetch('/api/themes');
const data = await res.json();

// After
const data = await api.get<Theme[]>('/marketplace/themes');
```

---

## Performance Targets

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| First Contentful Paint | <1.5s | Code splitting, lazy loading |
| Time to Interactive | <3.5s | Optimized bundles, preloading |
| Lighthouse Score | >90 | All optimizations applied |
| Re-render Count | Minimal | Selector hooks, memoization |
| API Response Time | <200ms | Caching, indexes, batching |
| Bundle Size | <200KB initial | Tree shaking, code splitting |

---

## Common Pitfalls

### ❌ Accessing Store in Event Handlers
```typescript
// BAD: Happens on every render
<button onClick={() => useAuthStore.getState().logout()}>

// GOOD: Use stable action
const { logout } = useAuthActions();
<button onClick={logout}>
```

### ❌ Creating Objects in Render
```typescript
// BAD: New object every render
<Component style={{ color: 'red' }} />

// GOOD: Memoized or static
const style = useMemo(() => ({ color: 'red' }), []);
<Component style={style} />
```

### ❌ Conditional Hook Usage
```typescript
// BAD: Hook order not consistent
if (condition) {
  const data = useHook();
}

// GOOD: Consistent hook order
const data = useHook();
if (!condition) return null;
```

---

## Debugging Tools

### Performance Profiler
```typescript
// Enable in development
if (process.env.NODE_ENV === 'development') {
  // Check React DevTools Profiler
  // Look for unexpected re-renders
}
```

### Logger Levels
```typescript
// In development: All levels shown
// In production: Only errors + sampled info

logger.debug('Detailed info');    // Dev only
logger.info('General info');      // Dev + sampled in prod
logger.warn('Warning');           // Dev + sampled in prod
logger.error('Error!');           // Always
logger.perf('Timing', 16);        // Dev + sampled in prod
```

---

## Support

For questions about the optimized architecture:
1. Check this guide first
2. Review the optimization summary: `OPTIMIZATION_SUMMARY.md`
3. Look at example implementations in `/client/app/examples`

---

*Last updated: Optimization Phase Complete*
*Next recommended: Add React Query integration examples*
