import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://pnfdwhitcqaoxxzlvtgr.supabase.co";

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_HSFvCan1w_KjhBqJozj6bg_KHD1pdo2";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session || getLocalSession();
}

export async function clearSession() {
  clearLocalSession();
  await supabase.auth.signOut();
}

export function getLocalSession() {
  try {
    return JSON.parse(window.localStorage.getItem("medai_local_session") || "null");
  } catch {
    return null;
  }
}

export function saveLocalSession(user) {
  const session = {
    user: {
      id: `local-${Date.now()}`,
      email: user.email,
      user_metadata: { full_name: user.name },
      app_metadata: { provider: user.provider || "local-demo" },
    },
    access_token: "local-demo-session",
  };
  window.localStorage.setItem("medai_local_session", JSON.stringify(session));
  return session;
}

export function clearLocalSession() {
  window.localStorage.removeItem("medai_local_session");
}
