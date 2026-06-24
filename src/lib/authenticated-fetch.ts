import { supabase } from "@/integrations/supabase/client";

export async function getSupabaseAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const authHeaders = await getSupabaseAuthHeaders();
  const headers = new Headers(init.headers);

  for (const [key, value] of Object.entries(authHeaders)) {
    headers.set(key, value);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
