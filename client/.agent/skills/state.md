# State Management (Zustand)

Nerve uses Zustand for global UI state and persistent settings.

## Core Stores
- `useAuthStore`: Firebase authentication state and access tokens.
- `useThemeStore`: Industrial Matrix theme settings and accent colors.
- `useMessagingStore`: Active conversation, unread counts, and blocked users.

## Pattern
1. **Persistence**: Use `persist` middleware for settings that should survive reloads (theme, auth hint).
2. **Fine-grained Selectors**: Use selectors to prevent unnecessary re-renders.
   ```typescript
   const user = useAuthStore(state => state.user);
   ```
3. **Actions inside Store**: Keep setter logic inside the store to maintain encapsulation.

## Persistence Configuration
Always provide a version and clear partialize logic.
```typescript
partialize: (state) => ({ 
  accentColor: state.accentColor,
  isIndustrial: state.isIndustrial 
}),
```
