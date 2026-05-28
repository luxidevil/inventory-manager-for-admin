---
name: React Query cache on auth switch
description: Stale TanStack Query cache shows previous user data after login/logout unless explicitly cleared
---

**Rule:** Call `queryClient.clear()` inside both `login()` and `logout()` in `useAuth()`.

**Why:** TanStack Query caches responses per query key. Switching auth tokens (e.g. admin logs out, another user registers) does NOT automatically invalidate the cache. The new `useGetMe` call may return before the old data is evicted, showing the wrong user in the sidebar and elsewhere.

**How to apply:** In `use-auth.tsx` (or wherever the auth state is managed), import `useQueryClient` from `@tanstack/react-query` and call `queryClient.clear()` synchronously before `setToken()` in both `login` and `logout`.

```ts
const login = (newToken: string) => {
  localStorage.setItem("auth_token", newToken);
  queryClient.clear();  // ← required
  setToken(newToken);
};
```
