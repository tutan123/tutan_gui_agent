// Client-side URL helpers (safe to import in "use client" components only)

export const TUTAN_BASE_URL_KEY = "TUTAN_BASE_URL";

export function normalizeTutanBaseUrl(input: string): string {
  const trimmed = (input || "").trim();
  // Empty -> keep empty (means use relative / same-origin)
  if (!trimmed) return "";
  // If user omitted scheme, assume http:// (common when someone types "localhost:3000")
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    return `http://${trimmed}`.replace(/\/+$/, "");
  }
  // Remove trailing slashes for stable join
  return trimmed.replace(/\/+$/, "");
}

export function getTutanBaseUrl(): string {
  try {
    return normalizeTutanBaseUrl(localStorage.getItem(TUTAN_BASE_URL_KEY) || "");
  } catch {
    return "";
  }
}

export function withBaseUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getTutanBaseUrl();
  if (!base) return p;
  // Avoid accidental double `/api` when user sets base URL like `http://host:3000/api`
  if (base.endsWith("/api") && p.startsWith("/api/")) {
    return `${base.slice(0, -4)}${p}`;
  }
  return `${base}${p}`;
}

