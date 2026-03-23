import { BOOKINGS_TABLE } from "@/constants";

type SupabaseEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
  };
}

export function hasSupabaseServerConfig() {
  const { url, anonKey, serviceRoleKey } = getSupabaseEnv();
  return Boolean(url && (serviceRoleKey || anonKey));
}

export function getSupabaseHeaders(returnRepresentation = false) {
  const { anonKey, serviceRoleKey } = getSupabaseEnv();
  const apiKey = serviceRoleKey || anonKey;

  if (!apiKey) {
    throw new Error("Не найден ключ Supabase. Добавь anon или service role ключ.");
  }

  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(returnRepresentation ? { Prefer: "return=representation" } : {}),
  };
}

export function getSupabaseTableUrl(query = "") {
  const { url } = getSupabaseEnv();

  if (!url) {
    throw new Error("Не найден NEXT_PUBLIC_SUPABASE_URL.");
  }

  const suffix = query ? `?${query}` : "";
  return `${url}/rest/v1/${BOOKINGS_TABLE}${suffix}`;
}
