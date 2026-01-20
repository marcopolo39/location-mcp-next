import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for browser usage
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Export a singleton for convenience
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseClient can only be called in the browser");
  }
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}
