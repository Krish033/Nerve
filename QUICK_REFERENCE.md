# Nurve Platform - Quick Reference Card

## 🚀 Essential Imports

```typescript
// State Management (Optimized)
import { useAuthUser, useAuthActions } from '@/lib/store/use-auth-optimized';
import { useActiveTheme, useThemeActions } from '@/lib/store/use-theme-optimized';

// API (With Caching)
import { api, withRetry } from '@/lib/api-optimized';

// React Query Hooks
import { 
  useThemes, 
  useInstallTheme, 
  useActivateTheme 
} from '@/lib/hooks/use-marketplace';

// Performance
import { useDebounce, useThrottle } from '@/lib/utils/performance';

// Error Handling
import { ErrorBoundary } from '@/components/shared/error-boundary-enhanced';

// Logging
import { logger } from '@/lib/logger-enhanced';
```

---

## 🎯 Common Patterns

### Auth State
```typescript
const user = useAuthUser();           // Only user object
const { logout } = useAuthActions();  // Only actions
const isAuth = useIsAuthenticated();  // Boolean check
```

### Theme State
```typescript
const theme = useActiveTheme();
const { setActiveTheme } = useThemeActions();
```

### API Calls
```typescript
// GET with caching
const data = await api.get('/endpoint');

// POST with retry
const result = await withRetry(
  () => api.post('/endpoint', data),
  { maxRetries: 3 }
);
```

### User Input
```typescript
const debouncedSearch = useDebounce((query) => {
  searchAPI(query);
}, 300);
```

---

## ⚡ Performance Checklist

Before submitting code:

- [ ] Using selector hooks (`useAuthUser` not `useAuthStore()`)
- [ ] Wrapped expensive computations in `useMemo`
- [ ] Stabilized callbacks with `useCallback`
- [ ] Debounced input handlers (>300ms)
- [ ] Added error boundaries
- [ ] No `console.log` statements
- [ ] Proper loading states

---

## 🐛 Error Handling

```typescript
// Log structured errors
logger.error('Operation failed', { 
  error, 
  context: { userId, operation } 
});

// Wrap components
<ErrorBoundary fallback={<ErrorUI />}>
  <YourComponent />
</ErrorBoundary>
```

---

## 📊 Performance Monitoring

```typescript
// Track slow operations
logger.perf('Data fetch', 150, { 
  endpoint: '/api/data',
  cache: 'miss'
});

// Track user actions
logger.track('button_clicked', { 
  buttonId: 'submit',
  page: 'checkout'
});
```

---

## 🔄 State Updates

### Optimistic Updates (React Query)
```typescript
const mutation = useMutation({
  mutationFn: updateData,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['data'] });
    
    // Snapshot previous
    const previous = queryClient.getQueryData(['data']);
    
    // Optimistically update
    queryClient.setQueryData(['data'], newData);
    
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback
    queryClient.setQueryData(['data'], context.previous);
  },
});
```

---

## 🎨 Theme Integration

```typescript
// CSS variables auto-applied by ThemeColorProvider
// Access via Tailwind classes:

<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">
    Primary Button
  </button>
  <p className="text-muted-foreground">
    Secondary text
  </p>
</div>
```

---

## 📝 Code Snippets

### New Component Template
```typescript
"use client";

import { memo } from 'react';
import { ErrorBoundary } from '@/components/shared/error-boundary-enhanced';
import { logger } from '@/lib/logger-enhanced';

interface Props {
  // Define props
}

function ComponentName({}: Props) {
  // Component logic
  
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

// Memoize for performance
export default memo(ComponentName);

// With error boundary wrapper
export function ComponentNameWithBoundary(props: Props) {
  return (
    <ErrorBoundary>
      <ComponentName {...props} />
    </ErrorBoundary>
  );
}
```

### New Store Template
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface State {
  data: any[];
}

interface Actions {
  setData: (data: any[]) => void;
}

const useStoreBase = create<State & Actions>()(
  persist(
    (set) => ({
      data: [],
      setData: (data) => set({ data }),
    }),
    { name: 'feature-storage' }
  )
);

// Selector hooks
export function useData() {
  return useStoreBase((state) => state.data);
}

export function useActions() {
  return useStoreBase((state) => ({
    setData: state.setData,
  }));
}
```

---

## 🔍 Debugging

### Check Re-renders
```typescript
import { useRenderPerf } from '@/lib/utils/performance';

function MyComponent() {
  useRenderPerf('MyComponent'); // Logs if >16ms
  return <div />;
}
```

### View Store State
```typescript
// In React DevTools:
// Components → Search for "Provider" → Inspect hooks

// Or log in component:
const state = useStoreBase(); // Full state (for debugging only)
console.log('Store state:', state);
```

---

## 🗄️ Database Queries

### Prisma Best Practices
```typescript
// Select only needed fields
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, name: true, email: true },
});

// Include with select
const themes = await prisma.userInstalledItem.findMany({
  where: { userId },
  include: { 
    item: { 
      select: { id: true, name: true, config: true } 
    } 
  },
});
```

---

## 🚀 Deployment Checklist

- [ ] Run `npm run build` (no errors)
- [ ] Check bundle size (<200KB initial)
- [ ] Verify all tests pass
- [ ] Check Lighthouse score (>90)
- [ ] Test error boundaries
- [ ] Verify API endpoints
- [ ] Check database migrations
- [ ] Review environment variables

---

## 📚 Documentation Links

- [Architecture Guide](./ARCHITECTURE_GUIDE.md) - Complete developer guide
- [Optimization Summary](./OPTIMIZATION_SUMMARY.md) - Technical details
- [Project Status](./PROJECT_STATUS.md) - Full project overview

---

## 🆘 Getting Help

1. Check this quick reference
2. Review ARCHITECTURE_GUIDE.md
3. Look at existing optimized components
4. Ask in team chat with context

---

**Keep this card handy!** ⚡
