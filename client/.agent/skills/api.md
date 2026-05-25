# API & Data Flow Pattern

Nerve uses a strict modular pattern for data fetching and mutations.

## Directory Structure
```
app/
  [module]/
    _partials/
      imports/
        queries.ts (TanStack Query hooks)
        schema.ts  (Zod schemas)
        ... (logic, services)
      ComponentA.tsx (Memoized sub-component)
      ...
    page.tsx (Main orchestrator)
```

## TanStack Query Usage
Always use custom hooks for queries and mutations.

### Example Query
```typescript
export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/users/profile');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

### Example Mutation
```typescript
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProfileFormValues) => api.patch('/users/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};
```

## Best Practices
1. **No Manual useEffect**: Avoid fetching data in `useEffect`. Use `useQuery`.
2. **Standardized Error Handling**: Use `toast` in mutation `onError` and `ErrorBoundary` for unexpected query failures.
3. **Optimistic Updates**: Use `queryClient.setQueryData` for immediate UI feedback on simple mutations.
