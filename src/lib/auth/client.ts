import { createAuthClient } from "better-auth/svelte";

export const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_APP_URL,
});

// Export typed hooks/methods
export const {
  signIn,
  signUp,
  signOut,
  useSession
} = authClient;
